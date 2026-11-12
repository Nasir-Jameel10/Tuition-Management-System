import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { unwrap, getName, getClass, isPaid, money } from "../utils/helpers";

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-xs text-slate-600">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Donut({ percent }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 140 140" className="w-36 h-36">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#fb923c" strokeWidth="14" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="14"
        strokeDasharray={`${(percent / 100) * c} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="68" textAnchor="middle" className="fill-slate-800 text-2xl font-bold">
        {percent}%
      </text>
      <text x="70" y="86" textAnchor="middle" className="fill-slate-500 text-[10px]">
        Collected
      </text>
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    students: [],
    classes: [],
    subjects: [],
    fees: [],
  });
  const [loading, setLoading] = useState(true);
useEffect(() => {
  const load = async () => {
    const [s, f] = await Promise.allSettled([
      api.get("/students"),
      api.get("/fees"),
    ]);
    const get = (r) => (r.status === "fulfilled" ? unwrap(r.value) : []);
    const students = get(s);

    // Classes aur subjects students ke fields se nikaalo
    const classes = [...new Set(students.map(getClass).filter((c) => c !== "-"))];
    const subjects = [
      ...new Set(
        students.flatMap((st) =>
          (st.subjects || []).map((x) => (typeof x === "object" ? x.name : x))
        )
      ),
    ];

    setData({ students, classes, subjects, fees: get(f) });
    setLoading(false);
  };
  load();
}, []);
  const { students, classes, subjects, fees } = data;

  const paidTotal = fees.filter(isPaid).reduce((a, f) => a + Number(f.amount || 0), 0);
  const pendingTotal = fees.filter((f) => !isPaid(f)).reduce((a, f) => a + Number(f.amount || 0), 0);
  const total = paidTotal + pendingTotal;
  const percent = total ? Math.round((paidTotal / total) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">
          {greeting}, {user?.name || "Admin"}!
        </h1>
        <p className="text-sm text-slate-500">
          Here's what's happening with your tuition system.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={students.length} color="bg-indigo-50" />
        <StatCard label="Total Classes" value={classes.length} color="bg-sky-50" />
        <StatCard label="Total Subjects" value={subjects.length} color="bg-orange-50" />
        <StatCard label="Total Fees (Paid)" value={money(paidTotal)} color="bg-emerald-50" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent students */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-3">Recent Students</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">#</th>
                <th>Name</th>
                <th>Class</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.slice(0, 5).map((s, i) => (
                <tr key={s._id || i} className="border-b last:border-0">
                  <td className="py-2">{i + 1}</td>
                  <td>{getName(s)}</td>
                  <td>{getClass(s)}</td>
                  <td>
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                      {s.status || "Active"}
                    </span>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400">
                    Abhi koi student nahi hai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Fee collection */}
        <div className="card">
          <h2 className="font-semibold mb-3">Monthly Fee Collection</h2>
          <div className="flex items-center gap-4">
            <Donut percent={percent} />
            <div className="text-xs space-y-2">
              <p>
                <span className="inline-block w-2 h-2 rounded-full bg-teal-500 mr-1" />
                Collected
                <br />
                <b>{money(paidTotal)}</b>
              </p>
              <p>
                <span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />
                Pending
                <br />
                <b>{money(pendingTotal)}</b>
              </p>
              <p className="text-slate-500">Total: {money(total)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}