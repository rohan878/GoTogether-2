import { useEffect, useState } from "react";
import api from "../lib/api";

type PendingUser = {
  _id: string;
  name: string;
  phone: string;
  kycStatus: string;
  createdAt: string;
};

export default function AdminPanel() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/admin/pending-users");
      setUsers(r.data.users || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load pending users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (userId: string) => {
    await api.patch(`/admin/users/${userId}/approve`);
    load();
  };

  const reject = async (userId: string) => {
    await api.patch(`/admin/users/${userId}/reject`);
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-3xl border bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-extrabold">Admin Approval 🧑‍⚖️✨</h1>
            <button
              onClick={load}
              className="rounded-2xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Pending users list. Approve করলে তারা ride create/accept/chat করতে পারবে।
          </p>

          {err && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-2xl border">
            <div className="grid grid-cols-12 bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white">
              <div className="col-span-3">Name</div>
              <div className="col-span-3">Phone</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-4 text-right">Actions</div>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-600">Loading…</div>
            ) : users.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No pending users 🎉</div>
            ) : (
              users.map((u) => (
                <div key={u._id} className="grid grid-cols-12 items-center gap-2 border-t px-4 py-4">
                  <div className="col-span-3 font-semibold">{u.name}</div>
                  <div className="col-span-3 text-sm text-gray-700">{u.phone}</div>
                  <div className="col-span-2">
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                      {u.kycStatus}
                    </span>
                  </div>
                  <div className="col-span-4 flex justify-end gap-2">
                    <button
                      onClick={() => reject(u._id)}
                      className="rounded-2xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approve(u._id)}
                      className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 text-sm text-gray-600">
            Tip: Only users with role <b>ADMIN</b> can access this page.
          </div>
        </div>
      </div>
    </div>
  );
}
