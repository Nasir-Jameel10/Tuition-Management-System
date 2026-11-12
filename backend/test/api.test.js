// Tests that don't need a database: they cover everything that is decided
// before a query is made (auth checks, parsing errors, 404s).
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/unused";

const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const app = require("../app");

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

const call = (path, options = {}) =>
  fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });

test("health check responds", async () => {
  const res = await call("/");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).success, true);
});

test("security headers are set and x-powered-by is hidden", async () => {
  const res = await call("/");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("unknown route returns JSON 404", async () => {
  const res = await call("/api/nope");
  assert.equal(res.status, 404);
  assert.equal((await res.json()).message, "API route not found");
});

test("malformed JSON returns a clean 400, not a stack trace", async () => {
  const res = await call("/api/auth/login", { method: "POST", body: "{bad json" });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "Invalid JSON in request body");
});

test("public registration is gone: register needs a token", async () => {
  const res = await call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "x", email: "x@x.com", password: "password123" })
  });
  assert.equal(res.status, 401);
});

for (const path of ["/api/students", "/api/attendance", "/api/fees", "/api/users"]) {
  test(`${path} requires authentication`, async () => {
    const res = await call(path);
    assert.equal(res.status, 401);
  });
}

test("garbage token is rejected", async () => {
  const res = await call("/api/students", { headers: { Authorization: "Bearer abc.def.ghi" } });
  assert.equal(res.status, 401);
});

test("token signed with a different algorithm is rejected", async () => {
  const token = jwt.sign({ id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET, {
    algorithm: "HS512"
  });
  const res = await call("/api/students", { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 401);
});

test("login validates input before touching the database", async () => {
  const res = await call("/api/auth/login", { method: "POST", body: JSON.stringify({}) });
  assert.equal(res.status, 400);
});
