import { useEffect, useState } from "react";
import api from "../api/axios";
import { money } from "../utils/helpers";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 2, THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

const ATTENDANCE_ROWS = [
  { key: "Present", bar: "bg-green-500" },
  { key: "Absent", bar: "bg-red-500" },
  { key: "Late", bar: "bg-amber-500" },
  { key: "Leave", bar: "bg-sky-500" },
];

const percentBar = (p) => (p >= 80 ? "bg-green-500" : p >= 50 ? "bg-amber-500" : "bg-red-500");

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-xs text-slate-600">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function Reports() {
  const [year, setYear] = useState(String(THIS_YEAR));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    api
      .get("/reports/overview", {
        params: { year, from: from || undefined, to: to || undefined },
      })
      .then(({ data }) => {
        if (!ignore) setData(data);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Reports load nahi ho sakin");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [year, from, to]);

  const feesTotal = data ? data.feesByMonth.reduce((a, m) => a + m.totalAmount, 0) : 0;
  const feesPaid = data ? data.feesByMonth.reduce((a, m) => a + m.paidAmount, 0) : 0;
  const feesPercent = feesTotal ? Math.round((feesPaid / feesTotal) * 100) : 0;

  const byMonth = data ? Object.fromEntries(data.feesByMonth.map((m) => [m.month, m])) : {};
  const maxMonth = data ? Math.max(1, ...data.feesByMonth.map((m) => m.totalAmount)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-sm text-slate-500">Fees, attendance aur marks ka khulasa</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}

      {loading && !data && <p className="text-slate-500">Loading...</p>}

      {data && (
        <>
          {/* ---------- Fees ---------- */}
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Fees Report</h2>
              <select className="input max-w-[130px]" value={year} onChange={(e) => setYear(e.target.value)}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label={`Total Fees (${data.year})`} value={money(feesTotal)} color="bg-indigo-50" />
              <StatCard label="Collected" value={money(feesPaid)} color="bg-emerald-50" />
              <StatCard label="Pending" value={money(feesTotal - feesPaid)} color="bg-orange-50" />
              <StatCard label="Collection %" value={`${feesPercent}%`} color="bg-sky-50" />
            </div>

            {/* Mahine ke hisab se bar chart: hara = wusool, narangi = baqaya */}
            <div>
              <div className="flex items-end gap-2">
                {SHORT.map((label, i) => {
                  const m = byMonth[i + 1];
                  const total = m ? m.totalAmount : 0;
                  const paid = m ? m.paidAmount : 0;
                  return (
                    <div
                      key={label}
                      className="flex-1 flex flex-col items-center"
                      title={`${MONTHS[i]}: ${money(paid)} / ${money(total)}`}
                    >
                      <div className="h-36 w-full flex items-end justify-center">
                        <div
                          className="w-full max-w-[36px] bg-orange-300 rounded-t flex items-end"
                          style={{ height: `${(total / maxMonth) * 100}%` }}
                        >
                          <div
                            className="w-full bg-teal-500 rounded-t"
                            style={{ height: total ? `${(paid / total) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-xs text-slate-500 mt-3">
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-500 mr-1" />
                  Collected
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-300 mr-1" />
                  Pending
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2">Month</th>
                    <th>Total</th>
                    <th>Collected</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {data.feesByMonth.map((m) => (
                    <tr key={m.month} className="border-b last:border-0">
                      <td className="py-2">{MONTHS[m.month - 1]}</td>
                      <td>{money(m.totalAmount)}</td>
                      <td>{money(m.paidAmount)}</td>
                      <td>{money(m.pendingAmount)}</td>
                    </tr>
                  ))}
                  {data.feesByMonth.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400">
                        {data.year} ka koi fee record nahi hai
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* ---------- Attendance ---------- */}
            <div className="card space-y-4">
              <h2 className="font-semibold">Attendance Report</h2>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">From</label>
                  <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">To</label>
                  <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                {(from || to) && (
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setFrom("");
                      setTo("");
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                {from || to ? "Chuni hui dates ki attendance" : "Ab tak ki saari attendance"} · Total records:{" "}
                {data.attendance.total}
              </p>

              {data.attendance.total === 0 ? (
                <p className="text-sm text-slate-400">Abhi koi attendance record nahi hai</p>
              ) : (
                <>
                  <p className="text-3xl font-bold">
                    {data.attendance.percent}%
                    <span className="text-sm font-normal text-slate-500 ml-2">hazri (Present + Late)</span>
                  </p>
                  <div className="space-y-3">
                    {ATTENDANCE_ROWS.map((r) => {
                      const count = data.attendance[r.key];
                      const pct = data.attendance.total ? (count / data.attendance.total) * 100 : 0;
                      return (
                        <div key={r.key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{r.key}</span>
                            <span className="text-slate-500">{count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded">
                            <div className={`h-2 rounded ${r.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ---------- Marks ---------- */}
            <div className="card space-y-4">
              <h2 className="font-semibold">Marks Report (Subject-wise Average)</h2>

              {data.marksBySubject.length === 0 ? (
                <p className="text-sm text-slate-400">Abhi koi result nahi hai</p>
              ) : (
                <div className="space-y-3">
                  {data.marksBySubject.map((s) => (
                    <div key={s.subjectId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{s.subject || "Deleted subject"}</span>
                        <span className="text-slate-500">
                          {s.averagePercent}% · {s.tests} results
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded">
                        <div
                          className={`h-2 rounded ${percentBar(s.averagePercent)}`}
                          style={{ width: `${Math.min(100, s.averagePercent)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
