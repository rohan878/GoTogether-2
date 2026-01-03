import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import TopBar from "@/components/TopBar";

export default function SettingsPage() {
  const [dnd, setDnd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get("/api/auth/me");
        setDnd(Boolean(me.data?.user?.dnd));
      } catch {
        // ignore
      }
    })();
  }, []);

  async function toggleDnd() {
    const next = !dnd;
    setDnd(next);
    setSaving(true);
    try {
      await api.patch("/api/auth/dnd", { dnd: next });
    } catch (e) {
      console.error(e);
      alert("Failed to update DND");
      setDnd(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <TopBar />
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-3xl border border-purple-200 bg-white/70 p-6 shadow-sm">
          <div className="text-2xl font-extrabold text-purple-700">⚙️ Settings</div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-purple-200 bg-white p-4">
            <div>
              <div className="font-bold text-slate-900">Do Not Disturb (DND)</div>
              <div className="text-sm text-slate-600">Turn off ride notifications</div>
            </div>

            <button
              onClick={toggleDnd}
              disabled={saving}
              className={`rounded-2xl px-4 py-2 font-bold text-white ${
                dnd ? "bg-pink-500 hover:bg-pink-600" : "bg-purple-500 hover:bg-purple-600"
              } disabled:opacity-60`}
            >
              {dnd ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
