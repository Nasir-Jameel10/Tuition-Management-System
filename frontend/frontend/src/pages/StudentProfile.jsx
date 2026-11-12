import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { money } from "../utils/helpers";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const FEE_STYLE = {
  Paid: "bg-green-100 text-green-700",
  Partial: "bg-amber-100 text-amber-700",
  Pending: "bg-red-100 text-red-600",
};
const percentStyle = (p) =>
  p >= 80 ? "bg-green-100 text-green-700" : p >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setProfile(null);
    setError("");
    api
      .get(`/students/${id}/profile`)
      .then(({ data }) => {
        if (!ignore) setProfile(data);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Profile load nahi ho saka");
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>
        <Link to="/students" className="btn-outline">
          Back
        </Link>
      </div>
    );
  }
  if (!profile) return <p className="text-slate-500">Loading...</p>;

  const { student, attendance, fees, marks } = profile;
  const c = student.class;
  const className = c && typeof c === "object" ? (c.section ? `${c.name} - ${c.section}` : c.name) : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {student.photo ? (
            <img src={student.photo} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center text-xl font-bold">
              {student.fullName?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{student.fullName}</h1>
            <p className="text-sm text-slate-500">
              {className} ·{" "}
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  student.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                }`}
              >
                {student.status}
              </span>
            </p>
          </div>
        </div>
        <div className="space-x-2">
          <Link to="/students" className="btn-outline">
            Back
          </Link>
          <Link to={`/students/${student._id}/edit`} className="btn-primary">
            Edit
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Personal Information</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Info label="Father Name" value={student.fatherName} />
          <Info label="Email" value={student.email} />
          <Info label="Phone" value={student.phone} />
          <Info label="Gender" value={student.gender} />
          <Info label="Date of Birth" value={fmtDate(student.dateOfBirth)} />
          <Info label="Joining Date" value={fmtDate(student.joiningDate)} />
          <Info label="Monthly Fee" value={money(student.monthlyFee)} />
          <div>
            <p className="text-xs text-slate-500">Subjects</p>
            {student.subjects?.length ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {student.subjects.map((s) => (
                  <span key={s._id} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded">
                    {s.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium">-</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 bg-emerald-50">
          <p className="text-xs text-slate-600">Attendance</p>
          <p className="text-2xl font-bold mt-1">{attendance.percent}%</p>
          <p className="text-xs text-slate-500 mt-1">
            P {attendance.Present} · A {attendance.Absent} · L {attendance.Late} · Lv {attendance.Leave} (
            {attendance.totalDays} din)
          </p>
        </div>
        <div className="rounded-xl p-4 bg-orange-50">
          <p className="text-xs text-slate-600">Fees Baqaya</p>
          <p className="text-2xl font-bold mt-1">{money(fees.remainingAmount)}</p>
          <p className="text-xs text-slate-500 mt-1">
            Total {money(fees.totalAmount)} · Paid {money(fees.paidAmount)}
          </p>
        </div>
        <div className="rounded-xl p-4 bg-sky-50">
          <p className="text-xs text-slate-600">Average Marks</p>
          <p className="text-2xl font-bold mt-1">{marks.averagePercent}%</p>
          <p className="text-xs text-slate-500 mt-1">Aakhri {marks.recent.length} results</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Fees History</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Month</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fees.records.map((f) => (
                <tr key={f._id} className="border-b last:border-0">
                  <td className="py-2">
                    {MONTHS[f.month - 1]} {f.year}
                  </td>
                  <td>{money(f.amount)}</td>
                  <td>{money(f.paidAmount)}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded ${FEE_STYLE[f.status] || ""}`}>{f.status}</span>
                  </td>
                </tr>
              ))}
              {fees.records.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400">
                    Koi fee record nahi hai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Recent Test Results</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Subject</th>
                <th>Test</th>
                <th>Marks</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {marks.recent.map((m) => (
                <tr key={m._id} className="border-b last:border-0">
                  <td className="py-2">{m.subject?.name || "-"}</td>
                  <td>{m.testName}</td>
                  <td>
                    {m.obtainedMarks} / {m.totalMarks}
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded ${percentStyle(m.percentage)}`}>
                      {m.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {marks.recent.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400">
                    Koi result nahi hai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
