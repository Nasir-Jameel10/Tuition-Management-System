import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <input className="input max-w-xs" placeholder="Search here..." />
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{user?.name || "Admin"}</span>
        <button onClick={logout} className="btn-outline">
          Logout
        </button>
      </div>
    </header>
  );
}