import { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const EMPTY = { name: "", email: "", phone: "", password: "", role: "Teacher" };

// Naya user (Teacher / Admin) banane ka popup
function AddUserModal({ onClose, onDone }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Password kam az kam 8 characters ka hona chahiye");

    setSaving(true);
    try {
      const { data } = await api.post("/auth/register", form);
      onDone(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "User nahi ban saka");
      setSaving(false);
    }
  };

  return (
    <Modal title="Add New User" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Full Name</label>
          <input className="input" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Email</label>
          <input className="input" type="email" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Phone (optional)</label>
          <input className="input" name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Password (kam az kam 8 characters)</label>
          <input
            className="input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Role</label>
          <select className="input" name="role" value={form.role} onChange={handleChange}>
            <option value="Teacher">Teacher</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const myId = user?.id || user?._id;

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isAdmin) return;
    let ignore = false;
    setLoading(true);
    api
      .get("/users", { params: { search: debounced || undefined, page, limit: 20 } })
      .then(({ data }) => {
        if (ignore) return;
        setUsers(data.users);
        setPagination(data.pagination);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Users load nahi ho sake");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [debounced, page, reloadKey, isAdmin]);

  if (!isAdmin) {
    return <p className="text-sm text-slate-500">Yeh page sirf Admin ke liye hai.</p>;
  }

  const handleCreated = (message) => {
    setShowAdd(false);
    setError("");
    setSuccess(message);
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  const toggleActive = async (u) => {
    const action = u.isActive ? "disable" : "enable";
    if (!window.confirm(`"${u.name}" ka account ${action} kar dein?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.patch(`/users/${u._id}`, { isActive: !u.isActive });
      setSuccess(`${u.name} ka account ${u.isActive ? "disable" : "enable"} ho gaya`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Account update nahi ho saka");
    }
  };

  const changeRole = async (u) => {
    const next = u.role === "Admin" ? "Teacher" : "Admin";
    const text =
      next === "Admin"
        ? `"${u.name}" ko Admin bana dein? Is ko poora access mil jayega (users banana, students delete karna, fees delete karna wagera).`
        : `"${u.name}" ko Admin se Teacher bana dein?`;
    if (!window.confirm(text)) return;
    setError("");
    setSuccess("");
    try {
      await api.patch(`/users/${u._id}`, { role: next });
      setSuccess(`${u.name} ab ${next} hai`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Role badla nahi ja saka");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-sm text-slate-500">Total: {pagination.total}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          + Add User
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">{success}</div>}

      <div className="card space-y-4">
        <input
          className="input max-w-xs"
          placeholder="Name ya email se search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => (
                  <tr key={u._id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || "-"}</td>
                    <td>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          u.role === "Admin" ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          u.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {u.isActive ? "Active" : "Pending / Disabled"}
                      </span>
                    </td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      {u._id !== myId && u.isActive && (
                        <button className="btn-outline" onClick={() => changeRole(u)}>
                          {u.role === "Admin" ? "Make Teacher" : "Make Admin"}
                        </button>
                      )}
                      {u._id !== myId && (
                        <button className="btn-outline" onClick={() => toggleActive(u)}>
                          {u.isActive ? "Disable" : "Approve"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">
                    Koi user nahi mila
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Page {pagination.page} of {pagination.pages || 1}
          </span>
          <div className="space-x-2">
            <button
              className="btn-outline disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn-outline disabled:opacity-50"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onDone={handleCreated} />}
    </div>
  );
}
