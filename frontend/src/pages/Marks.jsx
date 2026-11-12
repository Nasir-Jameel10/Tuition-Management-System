import { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { unwrap } from "../utils/helpers";

const todayString = () => new Date().toLocaleDateString("en-CA");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");
const toDateInput = (d) => (d ? String(d).slice(0, 10) : "");
const classOption = (c) => (c.section ? `${c.name} - ${c.section}` : c.name);

const percentStyle = (p) =>
  p >= 80 ? "bg-green-100 text-green-700" : p >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";

// ---------- Poori class ke marks ek saath likhne wala card ----------
function EntryCard({ classes, subjects, onSaved }) {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [testName, setTestName] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [date, setDate] = useState(todayString());

  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({}); // studentId -> obtained marks (text)
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pehli class aur pehla subject khud chun lo
  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0]._id);
  }, [classes, classId]);
  useEffect(() => {
    if (!subjectId && subjects.length) setSubjectId(subjects[0]._id);
  }, [subjects, subjectId]);

  // Class badalne par us ke Active students lao
  useEffect(() => {
    if (!classId) return;
    let ignore = false;
    setLoadingStudents(true);
    setMarks({});
    api
      .get("/students", { params: { class: classId, status: "Active", limit: 100 } })
      .then(({ data }) => {
        if (!ignore) setStudents([...data.students].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Students load nahi ho sake");
      })
      .finally(() => {
        if (!ignore) setLoadingStudents(false);
      });
    return () => {
      ignore = true;
    };
  }, [classId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    const total = Number(totalMarks);
    if (!testName.trim()) return setError("Test ka naam likhein");
    if (!Number.isFinite(total) || total < 1) return setError("Total marks 1 ya us se zyada hone chahiye");

    // Jis student ka box khali ho (ghair haazir) usay chhor do
    const results = [];
    for (const s of students) {
      const v = marks[s._id];
      if (v === undefined || v === "") continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > total) {
        return setError(`${s.fullName}: marks 0 se ${total} ke beech hone chahiye`);
      }
      results.push({ student: s._id, obtainedMarks: n });
    }
    if (results.length === 0) return setError("Kam az kam ek student ke marks likhein");

    setSaving(true);
    try {
      const { data } = await api.post("/marks/bulk", {
        subject: subjectId,
        testName: testName.trim(),
        totalMarks: total,
        date,
        results,
      });
      setMarks({});
      setTestName("");
      onSaved(`${data.count} students ke marks save ho gaye`);
    } catch (err) {
      setError(err.response?.data?.message || "Marks save nahi ho sake");
    } finally {
      setSaving(false);
    }
  };

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <div className="card text-sm text-slate-500">
        Marks likhne ke liye pehle kam az kam ek Class aur ek Subject banayein.
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="card space-y-4">
      <h2 className="font-semibold">Add Test Marks</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {classOption(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Subject</label>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Test Name</label>
          <input
            className="input"
            placeholder="e.g. Monthly Test 1"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Total Marks</label>
          <input
            className="input"
            type="number"
            min="1"
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2 w-10">#</th>
              <th>Student</th>
              <th className="w-48">Obtained Marks</th>
            </tr>
          </thead>
          <tbody>
            {loadingStudents && (
              <tr>
                <td colSpan="3" className="py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loadingStudents &&
              students.map((s, i) => (
                <tr key={s._id} className="border-b last:border-0">
                  <td className="py-2">{i + 1}</td>
                  <td className="font-medium">{s.fullName}</td>
                  <td>
                    <input
                      className="input !py-1.5 max-w-[140px]"
                      type="number"
                      min="0"
                      placeholder="-"
                      value={marks[s._id] ?? ""}
                      onChange={(e) => setMarks({ ...marks, [s._id]: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            {!loadingStudents && students.length === 0 && (
              <tr>
                <td colSpan="3" className="py-6 text-center text-slate-400">
                  Is class mein koi Active student nahi hai
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Jis student ka box khali rahega (ghair haazir), us ke marks save nahi honge.</p>
        <button type="submit" disabled={saving || students.length === 0} className="btn-primary disabled:opacity-60">
          {saving ? "Saving..." : "Save Marks"}
        </button>
      </div>
    </form>
  );
}

// ---------- Ek result edit karne ka popup ----------
function EditModal({ mark, onClose, onDone }) {
  const [testName, setTestName] = useState(mark.testName);
  const [totalMarks, setTotalMarks] = useState(String(mark.totalMarks));
  const [obtainedMarks, setObtainedMarks] = useState(String(mark.obtainedMarks));
  const [date, setDate] = useState(toDateInput(mark.date));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const total = Number(totalMarks);
    const got = Number(obtainedMarks);
    if (!Number.isFinite(total) || total < 1) return setError("Total marks 1 ya us se zyada hone chahiye");
    if (!Number.isFinite(got) || got < 0 || got > total) return setError(`Obtained marks 0 se ${total} ke beech hone chahiye`);

    setSaving(true);
    try {
      await api.put(`/marks/${mark._id}`, { testName: testName.trim(), totalMarks: total, obtainedMarks: got, date });
      onDone("Result update ho gaya");
    } catch (err) {
      setError(err.response?.data?.message || "Result update nahi ho saka");
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit Result" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
        <p className="text-sm text-slate-500">
          {mark.student?.fullName || "-"} · {mark.subject?.name || "-"}
        </p>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Test Name</label>
          <input className="input" value={testName} onChange={(e) => setTestName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Obtained</label>
            <input
              className="input"
              type="number"
              min="0"
              value={obtainedMarks}
              onChange={(e) => setObtainedMarks(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Total</label>
            <input
              className="input"
              type="number"
              min="1"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Date</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Main page ----------
export default function Marks() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [marks, setMarks] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [showEntry, setShowEntry] = useState(true);
  const [editMark, setEditMark] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get("/classes").then((res) => setClasses(unwrap(res))).catch(() => {});
    api.get("/subjects").then((res) => setSubjects(unwrap(res))).catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    api
      .get("/marks", {
        params: {
          class: classFilter || undefined,
          subject: subjectFilter || undefined,
          page,
          limit: 20,
        },
      })
      .then(({ data }) => {
        if (ignore) return;
        setMarks(data.marks);
        setPagination(data.pagination);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Results load nahi ho sake");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [classFilter, subjectFilter, page, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  const handleSaved = (message) => {
    setError("");
    setSuccess(message);
    setPage(1);
    refresh();
  };

  const handleEdited = (message) => {
    setEditMark(null);
    setError("");
    setSuccess(message);
    refresh();
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`${m.student?.fullName || "Student"} ka "${m.testName}" ka result delete kar dein?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/marks/${m._id}`);
      setSuccess("Result delete ho gaya");
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Result delete nahi ho saka");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Tests & Marks</h1>
          <p className="text-sm text-slate-500">Results: {pagination.total}</p>
        </div>
        <button className="btn-outline" onClick={() => setShowEntry((v) => !v)}>
          {showEntry ? "Hide Entry Form" : "+ Add Test Marks"}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">{success}</div>}

      {showEntry && <EntryCard classes={classes} subjects={subjects} onSaved={handleSaved} />}

      <div className="card space-y-4">
        <h2 className="font-semibold">Results</h2>

        <div className="flex flex-wrap gap-3">
          <select
            className="input max-w-[200px]"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {classOption(c)}
              </option>
            ))}
          </select>
          <select
            className="input max-w-[200px]"
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Student</th>
                <th>Subject</th>
                <th>Test</th>
                <th>Marks</th>
                <th>%</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading &&
                marks.map((m) => (
                  <tr key={m._id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{m.student?.fullName || "-"}</td>
                    <td>{m.subject?.name || "-"}</td>
                    <td>{m.testName}</td>
                    <td>
                      {m.obtainedMarks} / {m.totalMarks}
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded ${percentStyle(m.percentage)}`}>
                        {m.percentage}%
                      </span>
                    </td>
                    <td>{fmtDate(m.date)}</td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      <button className="btn-outline" onClick={() => setEditMark(m)}>
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(m)}
                          className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && marks.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400">
                    Abhi koi result nahi hai
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

      {editMark && <EditModal mark={editMark} onClose={() => setEditMark(null)} onDone={handleEdited} />}
    </div>
  );
}
