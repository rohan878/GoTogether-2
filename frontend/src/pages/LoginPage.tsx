import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { reconnectSocketWithToken } from "../lib/socket";

export default function LoginPage() {
  const nav = useNavigate();
  const { setToken, refreshMe } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ IMPORTANT: backend route should exist
      const res = await api.post("/api/auth/login", { phone, password });

      const token = res.data?.token;
      if (!token) {
        alert("Login failed: token missing");
        return;
      }

      setToken(token);
      reconnectSocketWithToken(token);
      await refreshMe();

      nav("/dashboard");
    } catch (err: any) {
      console.error(err);

      // show backend message if available
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed";

      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-purple-200 bg-white/70 p-8 shadow-sm">
        <h1 className="text-4xl font-extrabold text-purple-700">Welcome back 💗</h1>
        <p className="mt-2 text-slate-600">Login to continue</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (e.g., +8801XXXXXXXXX)"
            className="w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 text-lg outline-none focus:border-pink-400"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 text-lg outline-none focus:border-pink-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-purple-500 px-6 py-3 text-lg font-bold text-white shadow hover:bg-purple-600 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="text-center text-slate-600">
            No account?{" "}
            <button
              type="button"
              onClick={() => nav("/register")}
              className="font-bold text-purple-700 hover:underline"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
