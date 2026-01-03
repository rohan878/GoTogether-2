import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

type Noti = {
  _id: string;
  type: "SCHEDULE_REMINDER" | "PANIC_ALERT" | "RIDE_REQUEST";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

function fmtTime(t: string) {
  try {
    const d = new Date(t);
    return isNaN(d.getTime()) ? t : d.toLocaleString();
  } catch {
    return t;
  }
}

// ✅ Linkify URLs inside notification body
function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="underline font-bold text-purple-700 hover:text-pink-600 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Noti[]>([]);
  const [unread, setUnread] = useState(0);

  const badge = useMemo(() => (unread > 99 ? "99+" : String(unread)), [unread]);

  async function load() {
    const res = await api.get("/api/notifications?limit=30");
    setItems(res.data.notifications || []);
    setUnread(res.data.unreadCount || 0);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function markRead(id: string) {
    await api.post(`/api/notifications/${id}/read`);
    await load();
  }

  async function markAll() {
    await api.post("/api/notifications/read-all");
    await load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-2xl bg-white/70 border border-purple-200 px-4 py-2 font-bold text-purple-800 hover:bg-purple-50"
      >
        🔔 Notifications
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 rounded-full bg-pink-500 text-white text-xs font-black px-2 py-1">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[380px] max-w-[92vw] rounded-3xl border border-purple-200 bg-white shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-pink-100 to-purple-100">
            <div className="font-extrabold text-purple-800">Notifications</div>
            <button onClick={markAll} className="text-xs font-bold text-purple-800 underline">
              Mark all read
            </button>
          </div>

          <div className="max-h-[460px] overflow-y-auto p-3 space-y-2">
            {items.length === 0 ? (
              <div className="text-sm text-gray-600 p-3">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  onClick={() => markRead(n._id)}
                  className={
                    "w-full text-left rounded-2xl border p-3 hover:bg-purple-50 " +
                    (n.read ? "border-purple-100 bg-white" : "border-pink-200 bg-pink-50")
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-extrabold text-purple-800 text-sm">{n.title}</div>
                    <div className="text-[10px] text-gray-500">{fmtTime(n.createdAt)}</div>
                  </div>

                  <div className="mt-1 text-xs text-gray-700 whitespace-pre-line break-words">
                    {linkify(n.body)}
                  </div>

                  {!n.read && <div className="mt-2 text-[10px] font-black text-pink-600">NEW</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
