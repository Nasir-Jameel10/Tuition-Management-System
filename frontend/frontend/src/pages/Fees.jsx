import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { unwrap, money } from "../utils/helpers";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const METHODS = ["Cash", "Bank Transfer", "JazzCash", "EasyPaisa", "Other"];
const STATUS_STYLE = {
  Paid: "bg-green-100 text-green-700",
  Partial: "bg-amber-100 text-amber-700",
  Pending: "bg-red-100 text-red-600",
};

const now = new Date();
const THIS_MONTH = now.getMonth() + 1;
const THIS_YEAR = now.getFullYear();
const YEARS = [THIS_YEAR - 2, THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

const classLabel = (student) => {
  const c = student?.class;
  if (!c || typeof c !== "object") return "-";
  return c.section ? `${c.name} - ${c.section}` : c.name;
};

// Chhota sa popup
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Poori class (ya sab Active students) ke fee records ek saath banao
function GenerateModal({ classes, defaultMonth, defaultYear, onClose, onDone }) {
  const [month, setMonth] = useState(String(defaultMonth));
  const [year, setYear] = useState(String(defaultYear));
  const [dueDate, setDueDate] = useState(`${defaultYear}-${String(defaultMonth).padStart(2, "0")}-10`);
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = { month: Number(month), year: Number(year), dueDate };
      if (classId) body.class = classId;
      const { data } = await api.post("/fees/generate", body);
      onDone(data.message, Number(month), Number(year));
    } catch (err) {
      setError(err.response?.data?.message || "Fees generate nahi ho saki");
      setSaving(false);
    }
  };

  return (
    <Modal title="Generate Monthly Fees" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Month</label>
            <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Year</label>
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Due Date</label>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Class</label>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Sab Active Students</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.section ? `${c.name} - ${c.section}` : c.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Har student ki monthly fee ke hisab se record banega. Jin ka record pehle se hai unhe chhor diya jayega.
        </p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Payment wusool karo (partial payment bhi ho sakti hai)
function PaymentModal({ fee, onClose, onDone }) {
  const remaining = fee.amount - fee.paidAmount;
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payment = Number(amount);
    if (!Number.isInteger(payment) || payment <= 0) {
      setError("Amount poore rupees mein aur 0 se zyada hona chahiye");
      return;
    }
    if (payment > remaining) {
      setError(`Amount baqaya (${money(remaining)}) se zyada nahi ho sakta`);
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/fees/${fee._id}/payment`, { payment, paymentMethod: method });
      onDone(`${money(payment)} wusool ho gaye (${fee.student?.fullName || "student"})`);
    } catch (err) {
      setError(err.response?.data?.message || "Payment save nahi ho saki");
      setSaving(false);
    }
  };

  return (
    <Modal title="Receive Payment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
        <div className="text-sm bg-slate-50 rounded-md p-3 space-y-1">
          <p className="font-medium">{fee.student?.fullName || "-"}</p>
          <p className="text-slate-500">
            {MONTHS[fee.month - 1]} {fee.year}
          </p>
          <p>
            Total: <b>{money(fee.amount)}</b> · Paid: <b>{money(fee.paidAmount)}</b> · Baqaya: <b>{money(remaining)}</b>
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Amount (Rs.)</label>
          <input
            className="input"
            type="number"
            min="1"
            max={remaining}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Payment Method</label>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? "Saving..." : "Save Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Fees() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [classes, setClasses] = useState([]);

  const [month, setMonth] = useState(String(THIS_MONTH));
  const [year, setYear] = useState(String(THIS_YEAR));
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [showGenerate, setShowGenerate] = useState(false);
  const [payFee, setPayFee] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get("/classes").then((res) => setClasses(unwrap(res))).catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    api
      .get("/fees", {
        params: {
          month: month || undefined,
          year: year || undefined,
          status: status || undefined,
          page,
          limit: 50,
        },
      })
      .then(({ data }) => {
        if (ignore) return;
        setFees(data.fees);
        setSummary(data.summary);
        setPagination(data.pagination);
      })
      .catch((err) => {
        if (!ignore) setError(err.response?.data?.message || "Fees load nahi ho sakin");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [month, year, status, page, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  const handleGenerated = (message, m, y) => {
    setShowGenerate(false);
    setError("");
    setSuccess(message);
    // Naye bane records foran dikhane ke liye usi mahine par jao
    setMonth(String(m));
    setYear(String(y));
    setStatus("");
    setPage(1);
    refresh();
  };

  const handlePaid = (message) => {
    setPayFee(null);
    setError("");
    setSuccess(message);
    refresh();
  };

  const handleDelete = async (f) => {
    const hasPayments = f.paidAmount > 0;
    const text = hasPayments
      ? `Is record mein ${money(f.paidAmount)} ki payments darj hain. Phir bhi delete karein? Yeh wapas nahi ho sakta.`
      : "Yeh fee record delete kar dein?";
    if (!window.confirm(text)) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/fees/${f._id}`, { params: hasPayments ? { force: true } : {} });
      setSuccess("Fee record delete ho gaya");
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Fee record delete nahi ho saka");
    }
  };

  const percent = summary.totalAmount ? Math.round((summary.paidAmount / summary.totalAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Fees</h1>
          <p className="text-sm text-slate-500">Records: {pagination.total}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowGenerate(true)}>
          + Generate Monthly Fees
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">{success}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-indigo-50">
          <p className="text-xs text-slate-600">Total Fees</p>
          <p className="text-2xl font-bold mt-1">{money(summary.totalAmount)}</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50">
          <p className="text-xs text-slate-600">Collected</p>
          <p className="text-2xl font-bold mt-1">{money(summary.paidAmount)}</p>
        </div>
        <div className="rounded-xl p-4 bg-orange-50">
          <p className="text-xs text-slate-600">Pending</p>
          <p className="text-2xl font-bold mt-1">{money(summary.remainingAmount)}</p>
        </div>
        <div className="rounded-xl p-4 bg-sky-50">
          <p className="text-xs text-slate-600">Collection %</p>
          <p className="text-2xl font-bold mt-1">{percent}%</p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            className="input max-w-[170px]"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="input max-w-[130px]"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="input max-w-[150px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Student</th>
                <th>Class</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="9" className="py-6 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading &&
                fees.map((f) => (
                  <tr key={f._id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{f.student?.fullName || "-"}</td>
                    <td>{classLabel(f.student)}</td>
                    <td>
                      {MONTHS[f.month - 1]} {f.year}
                    </td>
                    <td>{money(f.amount)}</td>
                    <td>{money(f.paidAmount)}</td>
                    <td>{money(f.amount - f.paidAmount)}</td>
                    <td>{fmtDate(f.dueDate)}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[f.status] || ""}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      {f.status !== "Paid" && (
                        <button className="btn-primary !py-1.5 !px-3" onClick={() => setPayFee(f)}>
                          Receive
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(f)}
                          className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && fees.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-6 text-center text-slate-400">
                    Koi fee record nahi mila. "Generate Monthly Fees" se banayein.
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

      {showGenerate && (
        <GenerateModal
          classes={classes}
          defaultMonth={Number(month) || THIS_MONTH}
          defaultYear={Number(year) || THIS_YEAR}
          onClose={() => setShowGenerate(false)}
          onDone={handleGenerated}
        />
      )}
      {payFee && <PaymentModal fee={payFee} onClose={() => setPayFee(null)} onDone={handlePaid} />}
    </div>
  );
}
