import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Verification() {
  const nav = useNavigate();
  const [nid, setNid] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Optional: if no token, push back login
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) nav("/login");
  }, [nav]);

  const upload = async () => {
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      if (!nid || !selfie) {
        setErr("Please select both NID and Selfie");
        setLoading(false);
        return;
      }

      const form = new FormData();
      form.append("nid", nid);
      form.append("selfie", selfie);

      // ✅ backend route: POST /api/auth/upload-docs
      await api.post("/auth/upload-docs", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg("Uploaded ✅ Submitted for admin approval");

      // ✅ Next: go dashboard (dashboard should show pending state)
      setTimeout(() => nav("/dashboard"), 800);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-white p-6">
      <div className="mx-auto max-w-xl rounded-3xl border bg-white/80 p-7 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-extrabold">Verification 📄✨</h1>
        <p className="mt-1 text-gray-600 text-sm">
          Upload your NID and Selfie for admin approval. Approved users can create rides, receive notifications, and chat.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <label className="text-sm font-medium text-gray-700">NID Photo</label>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm"
              onChange={(e) => setNid(e.target.files?.[0] || null)}
            />
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <label className="text-sm font-medium text-gray-700">Selfie (holding NID)</label>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm"
              onChange={(e) => setSelfie(e.target.files?.[0] || null)}
            />
          </div>

          {msg && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}
            </div>
          )}
          {err && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <button
            onClick={upload}
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 font-semibold text-white shadow disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload & Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
