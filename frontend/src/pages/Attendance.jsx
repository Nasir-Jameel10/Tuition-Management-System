import { useEffect, useState } from "react";
import api from "../api/axios";
import { unwrap } from "../utils/helpers";

const STATUSES = [
  { value: "Present", active: "bg-green-600 text-white border-green-600" },
  { value: "Absent", active: "bg-red-500 text-white border-red-500" },
  { value: "Late", active: "bg-amber-500 text-white border-amber-500" },
  { value: "Leave", active: "bg-sky-500 text-white border-sky-500" },
];

// Aaj ki date "YYYY-MM-DD" (aap ke computer ke time ke hisab se)
const todayString = () => new Date().toLocaleDateString("en-CA");

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayString());

  // rows: [{ student, status, remarks, saved }]
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Classes load karo aur pehli class khud chun lo
  useEffect(() => {
    api
      .get("/classes")
      .then((res) => {
        const list = unwrap(res);
        setClasses(list);
        if (list.length) setClassId(list[0]._id);
      })
      .catch((err) => setError(err.response?.data?.message || "Classes load nahi ho sakin"));
  }, []);

  // Class ya date badalne par us din ki sheet load karo
  useEffect(() => {
    if (!classId || !date) return;
    let ignore = false;
    setLoading(true);
    setError("");
    api
      .get("/attendance/sheet", { params: { class: classId, date } })
      .then(({ data }) => {
        if (ignore) return;
        setRows(
          data.sheet.map((r) => ({
            student: r.student,
            // Jis ki attendance abhi tak mark nahi hui, usay Present maan kar dikhao
            status: r.status || "Present",
            remarks: r.remarks || "",
            saved: r.status !== null,
          }))
        );
      })
      .catch((err) => {
        if (!ignore) {
          setRows([]);
          setError(err.response?.data?.message || "Attendance load nahi ho saki");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [classId, date, reloadKey]);

  const setStatus = (id, status) =>
    setRows((rs) => rs.map((r) => (r.student._id === id ? { ...r, status } : r)));

  const setRemarks = (id, remarks) =>
    setRows((rs) => rs.map((r) => (r.student._id === id ? { ...r, remarks } : r)));

  const markAll = (status) => setRows((rs) => rs.map((r) => ({ ...r, status })));

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const records = rows.map((r) => ({
        student: r.student._id,
        status: r.status,
        remarks: r.remarks,
      }));
      const { data } = await api.post("/attendance/bulk", { date, records });
      setSuccess(data.message);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Attendance save nahi ho saki");
    } finally {
      setSaving(false);
    }
  };

  const counts = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
  rows.forEach((r) => {
    counts[r.status] += 1;
  });
  const unsaved = rows.filter((r) => !r.saved).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Attendance</h1>
        <p className="text-sm text-slate-500">Class aur date chun kar poori class ki hazri lagayein</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">{success}</div>}

      <div className="card space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Class</label>
            <select
              className="input min-w-[180px]"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSuccess("");
              }}
            >
              {classes.length === 0 && <option value="">Pehle class banayein</option>}
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.section ? `${c.name} - ${c.section}` : c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              max={todayString()}
              onChange={(e) => {
                setDate(e.target.value);
                setSuccess("");
              }}
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <button className="btn-outline" onClick={() => markAll("Present")} disabled={!rows.length}>
              Mark All Present
            </button>
            <button className="btn-outline" onClick={() => markAll("Absent")} disabled={!rows.length}>
              Mark All Absent
            </button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm">
            {STATUSES.map((s) => (
              <span key={s.value}>
                {s.value}: <b>{counts[s.value]}</b>
              </span>
            ))}
            <span className="text-slate-500">Total: {rows.length}</span>
          </div>
        )}

        {unsaved > 0 && (
          <div className="bg-amber-50 text-amber-700 text-sm rounded-md px-3 py-2">
            {unsaved} students ki attendance is date ke liye abhi save nahi hui (Present dikhai ja rahi hai). Save
            dabane par record ban jayega.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 w-10">#</th>
                <th>Student</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r, i) => (
                  <tr key={r.student._id} className="border-b last:border-0">
                    <td className="py-2">{i + 1}</td>
                    <td className="font-medium">{r.student.fullName}</td>
                    <td>
                      <div className="flex gap-1.5">
                        {STATUSES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setStatus(r.student._id, s.value)}
                            className={`px-2.5 py-1 rounded-md text-xs border transition ${
                              r.status === s.value
                                ? s.active
                                : "border-slate-300 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {s.value}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        className="input !py-1.5 max-w-[220px]"
                        placeholder="Optional"
                        maxLength={500}
                        value={r.remarks}
                        onChange={(e) => setRemarks(r.student._id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400">
                    Is class mein koi Active student nahi hai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="flex justify-end">
            <button className="btn-primary disabled:opacity-60" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
