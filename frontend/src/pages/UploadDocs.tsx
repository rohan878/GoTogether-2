import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function UploadDocs() {
  const nav = useNavigate();
  const [nid, setNid] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/auth/me");
        setMe(r.data);
        if (r.data?.kycStatus === "APPROVED") nav("/dashboard");
      } catch {
        nav("/login");
      }
    })();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!nid || !selfie) {
      setErr("Please select both NID and Selfie.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("nid", nid);
      fd.append("selfie", selfie);

      const r = await api.post("/auth/upload-docs", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOk(r.data?.message || "Uploaded");
      const rr = await api.get("/auth/me");
      setMe(rr.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (s?: string) => {
    const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";
    if (s === "APPROVED") return <span className={`${base} bg-green-100 text-green-700`}>APPROVED</span>;
    if (s === "PENDING") return <span className={`${base} bg-yellow-100 text-yellow-700`}>PENDING</span>;
    if (s === "REJECTED") return <span className={`${base} bg-red-100 text-red-700`}>REJECTED</span>;
    return <span className={`${base} bg-gray-100 text-gray-700`}>NONE</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold">Upload Documents 🪪✨</h1>
            {statusBadge(me?.kycStatus)}
          </div>

          <p className="mt-2 text-sm text-gray-600">
            NID + selfie upload করলে admin approve করবে। Approved হলে তুমি ride create/accept করতে পারবে।
          </p>

          {me?.kycStatus === "PENDING" && (
            <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Waiting for admin approval… (You can’t create/accept rides yet)
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="rounded-2xl border p-4">
              <label className="text-sm font-medium">NID Photo</label>
              <input
                type="file"
                accept="image/*"
                className="mt-2 w-full text-sm"
                onChange={(e) => setNid(e.target.files?.[0] || null)}
              />
            </div>

            <div className="rounded-2xl border p-4">
              <label className="text-sm font-medium">Selfie Photo</label>
              <input
                type="file"
                accept="image/*"
                className="mt-2 w-full text-sm"
                onChange={(e) => setSelfie(e.target.files?.[0] || null)}
              />
            </div>

            {err && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            )}
            {ok && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {ok}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload & Submit for Approval"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Once approved → you’ll be redirected to Dashboard 💜
          </div>
        </div>
      </div>
    </div>
  );
}
