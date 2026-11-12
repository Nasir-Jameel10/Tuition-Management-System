import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { unwrap } from "../utils/helpers";

// Classes aur Subjects dono ke liye ek hi reusable page.
// Props:
//   title    - page ka heading ("Classes")
//   label    - ek item ka naam ("Class")
//   endpoint - backend route ("/classes")
//   fields   - [{ name, label, placeholder, required }]
export default function CrudPage({ title, label, endpoint, fields }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin"; // backend mein sirf Admin add/edit/delete kar sakta hai

  const emptyForm = Object.fromEntries(fields.map((f) => [f.name, ""]));

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const res = await api.get(endpoint);
      setItems(unwrap(res));
    } catch (err) {
      setError(err.response?.data?.message || "Data load nahi ho saka");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, form);
        setSuccess(`${label} update ho gayi`);
      } else {
        await api.post(endpoint, form);
        setSuccess(`${label} add ho gayi`);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Save nahi ho saka");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setError("");
    setSuccess("");
    setForm(Object.fromEntries(fields.map((f) => [f.name, item[f.name] ?? ""])));
    setEditingId(item._id);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Kya aap waqai "${item[fields[0].name]}" delete karna chahte hain?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`${endpoint}/${item._id}`);
      setSuccess(`${label} delete ho gayi`);
      if (editingId === item._id) resetForm();
      await load();
    } catch (err) {
      // Agar kisi student se juri ho to backend 409 ke saath wajah batata hai
      setError(err.response?.data?.message || "Delete nahi ho saka");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-slate-500">Total: {items.length}</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">{success}</div>
      )}

      {isAdmin ? (
        <form onSubmit={handleSubmit} className="card">
          <h2 className="font-semibold mb-3">
            {editingId ? `Edit ${label}` : `Add New ${label}`}
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            {fields.map((f) => (
              <div key={f.name} className="flex-1 min-w-[180px]">
                <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                <input
                  className="input"
                  name={f.name}
                  value={form[f.name]}
                  onChange={handleChange}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              </div>
            ))}
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-outline">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="text-sm text-slate-500">Sirf Admin {title.toLowerCase()} add ya edit kar sakta hai.</p>
      )}

      <div className="card">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 w-12">#</th>
                {fields.map((f) => (
                  <th key={f.name}>{f.label}</th>
                ))}
                {isAdmin && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item._id} className="border-b last:border-0">
                  <td className="py-2">{i + 1}</td>
                  {fields.map((f) => (
                    <td key={f.name}>{item[f.name] || "-"}</td>
                  ))}
                  {isAdmin && (
                    <td className="text-right space-x-2">
                      <button onClick={() => startEdit(item)} className="btn-outline">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={fields.length + 2} className="py-6 text-center text-slate-400">
                    Abhi koi {label.toLowerCase()} nahi hai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
