import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime()
  );
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

// ✅ helper: remove raw map url from displayed text
function stripMapUrl(text: string) {
  return text
    .replace(/https?:\/\/(www\.)?google\.com\/maps\?q=[^\s]+/gi, "")
    .replace(/https?:\/\/maps\.google\.com\/\?q=[^\s]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ChatPage() {
  const { user } = useAuth();
  const { rideId } = useParams();
  const nav = useNavigate(); // ✅ added

  const rid = useMemo(() => rideId || "", [rideId]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // ✅ Fare state (KEEP — do not remove)
  const [fare, setFare] = useState<any>(null);
  const [fareLoading, setFareLoading] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  async function loadFare() {
    if (!rid) return;
    setFareLoading(true);
    try {
      const res = await api.get(`/api/fare/${rid}/quote`);
      setFare(res.data.quote);
    } catch {
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
      setMessages((prev) => uniqById([...prev, res.data.message]));
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function pinLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const res = await api.post(`/api/chat/${rid}/pin`, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: "Meet here (Pinned)",
      });
      setMessages((prev) => uniqById([...prev, res.data.message]));
    });
  }

  // ✅ Back button handler: ONLY navigate (NO cancel/leave API call)
  function goBack() {
    nav(-1); // goes to previous page (dashboard normally)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ✅ Fare card stays here (DON'T REMOVE) */}
        <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-purple-800">💸 Fare</h2>
            <button
              onClick={loadFare}
              className="px-4 py-2 rounded-2xl border border-purple-200 text-purple-700 font-semibold hover:bg-purple-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <FareBox label="Total Fare" value={fare ? `৳ ${fare.totalFare}` : "—"} />
            <FareBox label="Per Person" value={fare ? `৳ ${fare.perPassengerFare}` : "—"} />
            <FareBox
              label="Distance"
              value={fare ? `${(fare.distanceMeters / 1000).toFixed(2)} km` : "—"}
            />
          </div>

          {fareLoading && (
            <p className="mt-2 text-sm text-gray-500">Calculating fare…</p>
          )}
        </div>

        {/* Chat */}
        <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* ✅ NEW: Back button */}
              <button
                onClick={goBack}
                className="px-4 py-2 rounded-2xl border border-purple-200 text-purple-700 font-semibold hover:bg-purple-50"
              >
                ← Back
              </button>

              <div>
                <h2 className="text-2xl font-extrabold text-purple-800">💬 Chat</h2>
                <p className="text-xs text-gray-600">Ride: {rid}</p>
              </div>
            </div>

            <button
              onClick={pinLocation}
              className="px-5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold"
            >
              📍 Pin Location
            </button>
          </div>

          <div
            ref={listRef}
            className="mt-4 h-[420px] overflow-y-auto space-y-3 rounded-2xl border border-purple-200 bg-white p-4"
          >
            {messages.map((m) => {
              const sid = senderId(m.sender);
              const name =
                sid && user?._id && String(sid) === String(user._id)
                  ? "You"
                  : senderName(m.sender);

              if (m.type === "LOCATION") {
                const lat = m.meta?.lat;
                const lng = m.meta?.lng;
                const mapUrl =
                  m.meta?.mapUrl ||
                  (Number.isFinite(lat) && Number.isFinite(lng)
                    ? `https://www.google.com/maps?q=${lat},${lng}`
                    : null);

                const cleanText = stripMapUrl(m.text || "");

                return (
                  <div
                    key={m._id}
                    className="rounded-2xl bg-purple-50 border border-purple-200 p-4"
                  >
                    <p className="font-bold text-purple-800">{name} • Pinned Location</p>
                    <p className="text-gray-700 mt-1">📍 {cleanText || "Pinned location"}</p>

                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-purple-700 underline mt-2 inline-block"
                      >
                        Open in Maps
                      </a>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={m._id}
                  className="rounded-2xl bg-purple-50 border border-purple-200 p-4"
                >
                  <p className="font-bold text-purple-800">{name}</p>
                  <p className="text-gray-700">{m.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type message..."
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-purple-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-extrabold"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FareBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-purple-200 p-5">
      <p className="text-gray-600 font-semibold">{label}</p>
      <p className="mt-2 text-2xl font-black text-purple-800">{value}</p>
    </div>
  );
}
