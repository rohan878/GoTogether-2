import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import AuthShell from "../components/AuthShell";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Register() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("other");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      let photo: string | undefined = undefined;
      if (photoFile) photo = await fileToBase64(photoFile);

      await api.post("/api/auth/register", { name, phone, password, gender, photo });
      nav(`/otp?phone=${encodeURIComponent(phone)}`);
    } catch (e: any) {
      const serverMsg = e?.response?.data?.message;
      const netMsg = e?.message;
      setErr(serverMsg || netMsg || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Register"
      subtitle="Create your account, verify OTP by SMS, then upload NID + selfie for admin approval."
    >
      <h2 className="text-2xl font-bold">Create your account 🌸</h2>
      <p className="mt-1 text-sm text-gray-600">
        Provide your details — OTP will verify your phone ownership.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <input
            className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="+8801XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Gender</label>
            <select
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-300"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Profile Photo</label>
            <input
              type="file"
              accept="image/*"
              className="mt-2 w-full text-sm"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "Creating..." : "Register"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link className="font-semibold text-purple-700 hover:underline" to="/login">
            Login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
