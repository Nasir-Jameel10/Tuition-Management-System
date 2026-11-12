import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { unwrap, getName } from "../utils/helpers";

// "Class 9 - A" jaisa naam (class populate ho kar aati hai)
const classLabel = (s) => {
  const c = s?.class;
  if (!c || typeof c !== "object") return "-";
  return c.section ? `${c.name} - ${c.section}` : c.name;
};

export default function Students() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [classes, setClasses] = useState([]);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Class filter ke liye classes ek baar load karo
  useEffect(() => {
    api.get("/classes").then((res) => setClasses(unwrap(res))).catch(() => {});
  }, []);

  // Search box: har key par server call na ho, 300ms ruk kar karo
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Students load karo (search / filter / page badalne par)
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    api
      .get("/students", {
        params: {
          search: debounced || undefined,
          class: classId || undefined,
          status: status || undefined,
          page,
          limit: 10,
        },
      })
      .then(({ data }) => {
        if (ignore) return;
        setStudents(data.students);
        setPagination(data.pagination);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Students load nahi ho sake");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [debounced, classId, status, page, reloadKey]);

  const handleDeactivate = async (s) => {
    if (!window.confirm(`"${getName(s)}" ko Inactive kar dein? (record aur history mehfooz rahegi)`)) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/students/${s._id}`);
      setSuccess(`${getName(s)} Inactive ho gaya`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Student deactivate nahi ho saka");
    }
  };

  const handleDeletePermanent = async (s) => {
    if (
      !window.confirm(
        `"${getName(s)}" ko hamesha ke liye delete kar dein?\n\nIs ki attendance, fees aur marks bhi delete ho jayenge. Yeh wapas nahi ho sakta.`
      )
    )
      return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/students/${s._id}`, { params: { permanent: true } });
      setSuccess(`${getName(s)} hamesha ke liye delete ho gaya`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Student delete nahi ho saka");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Students</h1>
          <p className="text-sm text-slate-500">Total: {pagination.total}</p>
        </div>
        <Link to="/students/new" className="btn-primary">
          + Add Student
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">{success}</div>}

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-3">
          <input
            className="input max-w-xs"
            placeholder="Name, father name ya phone se search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-[200px]"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.section ? `${c.name} - ${c.section}` : c.name}
              </option>
            ))}
          </select>
          <select
            className="input max-w-[160px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 w-10">#</th>
                <th>Name</th>
                <th>Father Name</th>
                <th>Class</th>
                <th>Phone</th>
                <th>Monthly Fee</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="8" className="py-6 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading &&
                students.map((s, i) => (
                  <tr key={s._id} className="border-b last:border-0">
                    <td className="py-2">{(pagination.page - 1) * 10 + i + 1}</td>
                    <td className="font-medium">
                      <Link to={`/students/${s._id}`} className="text-brand hover:underline">
                        {getName(s)}
                      </Link>
                    </td>
                    <td>{s.fatherName}</td>
                    <td>{classLabel(s)}</td>
                    <td>{s.phone}</td>
                    <td>Rs. {Number(s.monthlyFee || 0).toLocaleString()}</td>
                    <td>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          s.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      <Link to={`/students/${s._id}/edit`} className="btn-outline">
                        Edit
                      </Link>
                      {isAdmin && s.status === "Active" && (
                        <button onClick={() => handleDeactivate(s)} className="btn-outline">
                          Deactivate
                        </button>
                      )}
                      {isAdmin && s.status === "Inactive" && (
                        <button
                          onClick={() => handleDeletePermanent(s)}
                          className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-6 text-center text-slate-400">
                    Koi student nahi mila
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
    </div>
  );
}
