import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/students", label: "Students", icon: "🎓" },
  { to: "/classes", label: "Classes", icon: "🏫" },
  { to: "/subjects", label: "Subjects", icon: "📚" },
  { to: "/attendance", label: "Attendance", icon: "📋" },
  { to: "/marks", label: "Tests & Marks", icon: "📝" },
  { to: "/fees", label: "Fees", icon: "💰" },
  { to: "/reports", label: "Reports", icon: "📊" },
  { to: "/users", label: "Users", icon: "👥", adminOnly: true },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const visibleLinks = links.filter((l) => !l.adminOnly || user?.role === "Admin");

  return (
    <aside className="w-56 bg-navy-900 text-slate-200 min-h-screen flex flex-col shrink-0">
      <div className="px-5 py-5 text-white font-semibold text-sm border-b border-white/10">
        🎓 Tuition System
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {visibleLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                isActive
                  ? "bg-brand text-white"
                  : "hover:bg-navy-700 text-slate-300"
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}