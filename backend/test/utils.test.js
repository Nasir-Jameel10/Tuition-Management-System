const test = require("node:test");
const assert = require("node:assert/strict");

process.env.APP_TIMEZONE = "Asia/Karachi";

const { todayString, parseDateOnly, isNotFuture } = require("../utils/dates");
const { pick, passwordProblem, parsePagination, escapeRegex, isId } = require("../utils/helpers");

// 2026-10-30 20:00 UTC is already 2026-10-31 01:00 in Pakistan
const now = new Date("2026-10-30T20:00:00.000Z");

test("todayString uses the academy timezone, not UTC", () => {
  assert.equal(todayString(now), "2026-10-31");
  assert.equal(todayString(now, "UTC"), "2026-10-30");
});

test("parseDateOnly accepts today in the local timezone", () => {
  const date = parseDateOnly("2026-10-31", { now });
  assert.equal(date.toISOString(), "2026-10-31T00:00:00.000Z");
});

test("parseDateOnly rejects future, malformed and impossible dates", () => {
  assert.equal(parseDateOnly("2026-11-01", { now }), null);
  assert.equal(parseDateOnly("2026-02-30", { now }), null);
  assert.equal(parseDateOnly("31-10-2026", { now }), null);
  assert.equal(parseDateOnly(20261031, { now }), null);
  assert.equal(parseDateOnly(undefined, { now }), null);
});

test("parseDateOnly can allow future dates for range queries", () => {
  assert.ok(parseDateOnly("2030-01-01", { now, allowFuture: true }));
});

test("isNotFuture compares calendar days", () => {
  assert.equal(isNotFuture(new Date("2026-10-31T00:00:00.000Z"), now), true);
  assert.equal(isNotFuture(new Date("2026-11-01T00:00:00.000Z"), now), false);
});

test("pick copies only whitelisted fields", () => {
  const result = pick({ a: 1, b: 2, _id: "x", role: "Admin" }, ["a", "b"]);
  assert.deepEqual(result, { a: 1, b: 2 });
  assert.deepEqual(pick(null, ["a"]), {});
});

test("passwordProblem enforces length rules", () => {
  assert.ok(passwordProblem("short"));
  assert.ok(passwordProblem(undefined));
  assert.ok(passwordProblem("a".repeat(73)));
  assert.equal(passwordProblem("a-good-password"), null);
});

test("parsePagination clamps values", () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(parsePagination({ page: "3", limit: "10" }), { page: 3, limit: 10, skip: 20 });
  assert.equal(parsePagination({ limit: "9999" }, { maxLimit: 100 }).limit, 100);
  assert.equal(parsePagination({ page: "-4" }).page, 1);
});

test("escapeRegex neutralises regex characters", () => {
  assert.equal(escapeRegex("a.b*c"), "a\\.b\\*c");
});

test("isId only accepts real ObjectIds", () => {
  assert.equal(isId("507f1f77bcf86cd799439011"), true);
  assert.equal(isId("aaaaaaaaaaaa"), false);
  assert.equal(isId({ $ne: null }), false);
});
