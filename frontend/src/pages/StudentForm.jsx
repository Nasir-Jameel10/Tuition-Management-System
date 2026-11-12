import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { unwrap } from "../utils/helpers";

const EMPTY = {
  fullName: "",
  fatherName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  class: "",
  subjects: [],
  monthlyFee: "",
  joiningDate: "",
  status: "Active",
};

// Server ki date ("2026-11-12T00:00:00.000Z") ko <input type="date"> ke format mein badlo
const toDateInput = (d) => (d ? String(d).slice(0, 10) : "");

// Add aur Edit dono ke liye ek hi form: /students/new aur /students/:id/edit
export default function StudentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    const requests = [api.get("/classes"), api.get("/subjects")];
    if (isEdit) requests.push(api.get(`/students/${id}`));

    Promise.all(requests)
      .then(([c, s, st]) => {
        if (ignore) return;
        setClasses(unwrap(c));
        setSubjects(unwrap(s));
        if (st) {
          const x = st.data.student;
          setForm({
            fullName: x.fullName || "",
            fatherName: x.fatherName || "",
            email: x.email || "",
            phone: x.phone || "",
            dateOfBirth: toDateInput(x.dateOfBirth),
            gender: x.gender || "",
            class: x.class?._id || "",
            subjects: (x.subjects || []).map((sub) => sub._id),
            monthlyFee: x.monthlyFee ?? "",
            joiningDate: toDateInput(x.joiningDate),
            status: x.status || "Active",
          });
        }
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Data load nahi ho saka");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id, isEdit]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleSubject = (subjectId) =>
    setForm((f) => ({
      ...f,
      subjects: f.subjects.includes(subjectId)
        ? f.subjects.filter((x) => x !== subjectId)
        : [...f.subjects, subjectId],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = { ...form, monthlyFee: Number(form.monthlyFee) };
    if (!payload.joiningDate) delete payload.joiningDate; // khali ho to backend aaj ki date lagata hai

    try {
      if (isEdit) await api.put(`/students/${id}`, payload);
      else await api.post("/students", payload);
      navigate("/students");
    } catch (err) {
      setError(err.response?.data?.message || "Student save nahi ho saka");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;

  const field = (label, name, props = {}) => (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input className="input" name={name} value={form[name]} onChange={handleChange} {...props} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{isEdit ? "Edit Student" : "Add New Student"}</h1>
        <Link to="/students" className="btn-outline">
          Back
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}

      {!isEdit && classes.length === 0 && (
        <div className="bg-amber-50 text-amber-700 text-sm rounded-md px-3 py-2">
          Pehle Classes page par kam az kam ek class banayein, phir student add hoga.
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {field("Full Name", "fullName", { required: true })}
          {field("Father Name", "fatherName", { required: true })}
          {field("Email", "email", { type: "email", required: true })}
          {field("Phone", "phone", { required: true })}
          {field("Date of Birth", "dateOfBirth", { type: "date", required: true })}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Gender</label>
            <select className="input" name="gender" value={form.gender} onChange={handleChange} required>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Class</label>
            <select className="input" name="class" value={form.class} onChange={handleChange} required>
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.section ? `${c.name} - ${c.section}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {field("Monthly Fee (Rs.)", "monthlyFee", { type: "number", min: "0", step: "1", required: true })}
          {field("Joining Date", "joiningDate", { type: "date" })}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select className="input" name="status" value={form.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-2">Subjects</label>
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-400">Abhi koi subject nahi hai (Subjects page se banayein)</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {subjects.map((s) => (
                <label key={s._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.subjects.includes(s._id)}
                    onChange={() => toggleSubject(s._id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Saving..." : isEdit ? "Update Student" : "Save Student"}
          </button>
          <Link to="/students" className="btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
