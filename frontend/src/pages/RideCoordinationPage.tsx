import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

type SenderObj = { _id?: string; name?: string; photo?: string };

type Msg = {
  _id: string;
  rideId: string;
  type: "TEXT" | "SYSTEM" | "LOCATION";
  sender?: string | SenderObj | null;
  text: string;
  meta?: any;
  createdAt?: string;
};

function uniqById(list: Msg[]) {
  const map = new Map<string, Msg>();
  for (const m of list) map.set(m._id, m);
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return ta - tb;
  });
}

function senderName(sender: Msg["sender"]) {
  if (!sender) return "System";
  if (typeof sender === "string") return "User";
  return sender.name || "User";
}
function senderId(sender: Msg["sender"]) {
  if (!sender) return null;
  if (typeof sender === "string") return sender;
  return sender._id || null;
}

export default function RideCoordinationPage() {
  const { user } = useAuth();
  const { rideId } = useParams();

  const [fare, setFare] = useState<any>(null);
  const [fareLoading, setFareLoading] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const rid = useMemo(() => rideId || "", [rideId]);

  async function loadFare() {
    if (!rid) return;
    setFareLoading(true);
    try {
      // ✅ FIX: correct endpoint
      const res = await api.get(`/api/fare/${rid}`);
      setFare(res.data);
    } catch (e) {
      console.error("fare load failed", e);
      setFare(null);
    } finally {
      setFareLoading(false);
    }
  }

  async function loadMessages() {
    if (!rid) return;
    const res = await api.get(`/api/chat/${rid}/messages`);
    setMessages(uniqById(res.data.messages || []));
  }

  useEffect(() => {
    loadFare();
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  async function sendMessage() {
    const t = text.trim();
    if (!t || !rid) return;

    setSending(true);
    try {
      const res = await api.post(`/api/chat/${rid}/messages`, { text: t });
      const saved = res.data.message as Msg;
      setMessages((prev) => uniqById([...prev, saved]));
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function sharePinnedLocation() {
    if (!rid) return;
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const label = "Meet here (Pinned)";
        const res = await api.post(`/api/chat/${rid}/pin`, { lat, lng, label });

        const msg = res.data.message as Msg;
        if (msg?._id) setMessages((prev) => uniqById([...prev, msg]));
      },
      () => alert("Location permission denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-purple-800">Ride Coordination</h1>
              <p className="text-sm text-gray-600 mt-1">Route • Fare • Chat • Pin location</p>
            </div>
            <span className="px-4 py-2 rounded-full bg-green-100 text-green-800 font-bold">Status: open</span>
          </div>
        </div>

        {/* Fare */}
        <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-purple-800">💸 Fare</h2>
            <button
              onClick={loadFare}
              disabled={fareLoading}
              className="px-5 py-2 rounded-2xl bg-white border border-purple-200 text-purple-800 font-bold hover:bg-purple-50 disabled:opacity-60"
            >
              {fareLoading ? "Refreshing..." : "⟳ Refresh"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Total Fare" value={fare?.totalFare != null ? `৳ ${Math.round(fare.totalFare)}` : "—"} />
            <Card title="Per Person" value={fare?.perPerson != null ? `৳ ${Math.round(fare.perPerson)}` : "—"} />
            <Card title="Distance" value={fare?.distanceKm != null ? `${fare.distanceKm} km` : "—"} />
          </div>

          {fare?.people != null && (
            <p className="mt-3 text-xs text-gray-600">
              Split between <b>{fare.people}</b> person(s) (rider + passengers).
            </p>
          )}
        </div>

        {/* Chat */}
        <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-extrabold text-purple-800">💬 Chat</h2>
            <button
              onClick={sharePinnedLocation}
              className="px-5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold shadow hover:opacity-95"
            >
              📍 Pin Location
            </button>
          </div>

          <div
            ref={listRef}
            className="mt-4 h-[420px] overflow-y-auto rounded-2xl border border-purple-200 bg-white p-4 space-y-3"
          >
            {messages.map((m) => (
              <MessageBubble key={m._id} msg={m} myId={user?._id} />
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type message..."
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-extrabold shadow disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-purple-200 bg-white p-5">
      <p className="text-gray-600 font-semibold">{title}</p>
      <p className="mt-3 text-3xl font-black text-purple-800">{value}</p>
    </div>
  );
}

function MessageBubble({ msg, myId }: { msg: Msg; myId?: string }) {
  const sid = senderId(msg.sender);
  const name = sid && myId && String(sid) === String(myId) ? "You" : senderName(msg.sender);

  if (msg.type === "LOCATION") {
    const lat = msg.meta?.lat;
    const lng = msg.meta?.lng;
    const link =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : null;

    return (
      <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
        <p className="font-bold text-purple-800">{name} • Pinned Location</p>
        <p className="text-gray-700 mt-1">{msg.text}</p>
        {link && (
          <a className="text-sm text-purple-700 underline mt-2 inline-block" href={link} target="_blank" rel="noreferrer">
            Open in Maps
          </a>
        )}
      </div>
    );
  }

  if (msg.type === "SYSTEM") {
    return (
      <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-gray-800">
        {msg.text || "System update"}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
      <p className="text-purple-800 font-extrabold">{name}</p>
      <p className="text-gray-700">{msg.text}</p>
    </div>
  );
}
