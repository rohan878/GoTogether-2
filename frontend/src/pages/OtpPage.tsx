import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import api from "../lib/api";

export default function Otp() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const defaultPhone = useMemo(() => sp.get("phone") || "", [sp]);

  const [phone, setPhone] = useState(defaultPhone);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { phone, otp });
      localStorage.setItem("token", res.data.token);

      // ✅ After OTP → go to verification upload page
      nav("/verification");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "OTP verify failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Verify OTP" subtitle="Enter the 6-digit OTP you received via SMS.">
      <h2 className="text-2xl font-bold">OTP Verification 💗</h2>
      <p className="mt-1 text-sm text-gray-600">
        Please enter the OTP sent to your phone number.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <input
            className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-300"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+8801XXXXXXXXX"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">OTP</label>
          <input
            className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit OTP"
          />
        </div>

        {err && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Back to{" "}
          <Link className="font-semibold text-purple-700 hover:underline" to="/login">
            Login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
