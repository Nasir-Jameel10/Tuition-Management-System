import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { currentPassword, newPassword, confirmPassword } = form;
    if (newPassword.length < 8) return setError("Naya password kam az kam 8 characters ka hona chahiye");
    if (newPassword.length > 72) return setError("Naya password 72 characters se zyada nahi ho sakta");
    if (newPassword !== confirmPassword) return setError("Naya password aur confirm password match nahi karte");
    if (newPassword === currentPassword) return setError("Naya password purane se alag hona chahiye");

    setSaving(true);
    try {
      const { data } = await api.patch("/auth/change-password", { currentPassword, newPassword });
      // Purane tokens ab band ho gaye hain, naya token save karo taake logout na ho
      localStorage.setItem("token", data.token);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess("Password badal gaya");
    } catch (err) {
      setError(err.response?.data?.message || "Password nahi badla ja saka");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">Apna account aur password</p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">My Account</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Info label="Name" value={user?.name} />
          <Info label="Email" value={user?.email} />
          <Info label="Phone" value={user?.phone} />
          <Info label="Role" value={user?.role} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-semibold">Change Password</h2>

        {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">{success}</div>}

        <div>
          <label className="block text-xs text-slate-500 mb-1">Current Password</label>
          <input
            className="input"
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">New Password (kam az kam 8 characters)</label>
          <input
            className="input"
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Confirm New Password</label>
          <input
            className="input"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Saving..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
