import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const EMPTY_SIGNUP = { name: "", email: "", phone: "", password: "", confirmPassword: "" };

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" ya "signup"
  const [form, setForm] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState(EMPTY_SIGNUP);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSignupChange = (e) => setSignup({ ...signup, [e.target.name]: e.target.value });

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login fail ho gaya");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (signup.password.length < 8) return setError("Password kam az kam 8 characters ka hona chahiye");
    if (signup.password !== signup.confirmPassword) return setError("Password aur confirm password match nahi karte");

    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", {
        name: signup.name,
        email: signup.email,
        phone: signup.phone,
        password: signup.password,
      });
      setSignup(EMPTY_SIGNUP);
      setMode("login");
      setSuccess(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Signup nahi ho saka");
    } finally {
      setLoading(false);
    }
  };

  const passwordInput = (name, placeholder, value, onChange) => (
    <div className="relative">
      <input
        className="input pr-10"
        type={showPass ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
      />
      <button
        type="button"
        onClick={() => setShowPass(!showPass)}
        className="absolute right-3 top-2 text-slate-400"
      >
        {showPass ? "🙈" : "👁️"}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-navy-900">
      {/* Left: branding */}
      <div className="hidden md:flex flex-col justify-center px-16 text-white">
        <div className="text-5xl mb-4">🎓</div>
        <h1 className="text-3xl font-bold leading-tight">
          Tuition Management
          <br />
          System
        </h1>
        <p className="text-sm text-slate-300 mt-2">Better Learning | Brighter Future</p>
        <ul className="mt-10 space-y-3 text-sm text-slate-200">
          <li>👥 Manage Students</li>
          <li>📋 Track Attendance</li>
          <li>📝 Record Marks</li>
          <li>💰 Manage Fees</li>
        </ul>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6">
        {mode === "login" ? (
          <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8 space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">Welcome Back!</h2>
              <p className="text-xs text-slate-500">Login to your account</p>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">{success}</div>}

            <input
              className="input"
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            {passwordInput("password", "Password", form.password, handleChange)}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className="text-center text-xs text-slate-500">
              Account nahi hai?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="text-brand font-medium hover:underline">
                Sign Up
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8 space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">Create Account</h2>
              <p className="text-xs text-slate-500">Teacher account ke liye request bhejein</p>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm rounded-md px-3 py-2">{error}</div>}

            <input
              className="input"
              name="name"
              placeholder="Full Name"
              value={signup.name}
              onChange={handleSignupChange}
              required
            />
            <input
              className="input"
              type="email"
              name="email"
              placeholder="Email"
              value={signup.email}
              onChange={handleSignupChange}
              required
            />
            <input
              className="input"
              name="phone"
              placeholder="Phone (optional)"
              value={signup.phone}
              onChange={handleSignupChange}
            />
            {passwordInput("password", "Password (kam az kam 8 characters)", signup.password, handleSignupChange)}
            {passwordInput("confirmPassword", "Confirm Password", signup.confirmPassword, handleSignupChange)}

            <p className="text-xs text-slate-500">
              Account Admin ke approve karne ke baad hi chalega.
            </p>

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "Sending..." : "Sign Up"}
            </button>

            <p className="text-center text-xs text-slate-500">
              Pehle se account hai?{" "}
              <button type="button" onClick={() => switchMode("login")} className="text-brand font-medium hover:underline">
                Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
