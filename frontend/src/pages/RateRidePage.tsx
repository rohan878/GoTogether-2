import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Participant = {
  _id: string;
  name: string;
  gender?: string;
  photo?: string;
  ratingAvg?: number;
  ratingCount?: number;
  reliabilityScore?: number;
};

function getId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v._id || v.id || "");
  return String(v);
}

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-xl border text-lg font-bold ${
            n <= value
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
          }`}
          aria-label={`${n} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function RateRidePage() {
  const { rideId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const rid = useMemo(() => String(rideId || ""), [rideId]);

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [toUserId, setToUserId] = useState<string>("");
  const [behavior, setBehavior] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [safety, setSafety] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myId = getId(user?._id || user?.id);

  const participants: Participant[] = useMemo(() => {
    const r = ride?.rider ? (ride.rider as any) : null;
    const ps = Array.isArray(ride?.passengers) ? ride.passengers : [];
    const list = [r, ...ps].filter(Boolean).map((u: any) => ({
      _id: getId(u),
      name: u?.name || "User",
      gender: u?.gender,
      photo: u?.photo,
      ratingAvg: u?.ratingAvg,
      ratingCount: u?.ratingCount,
      reliabilityScore: u?.reliabilityScore,
    }));
    return list.filter((u) => u._id && u._id !== myId);
  }, [ride, myId]);

  useEffect(() => {
    (async () => {
      if (!rid) return;
      setLoading(true);
      setErr("");
      try {
        const res = await api.get(`/api/rides/detail/${rid}`);
        setRide(res.data.ride);
      } catch (e: any) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load ride");
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  async function submit() {
    if (!toUserId) {
      alert("Select someone to rate.");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      await api.post("/api/ratings", {
        rideId: rid,
        toUserId,
        behavior,
        punctuality,
        safety,
        comment,
      });
      alert("Rating submitted ✅");
      setComment("");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Rating failed";
      setErr(msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl bg-white/70 border border-purple-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-purple-800">⭐ Rate this ride</h1>
              <p className="text-xs text-gray-600 mt-1">Ride: {rid}</p>
            </div>
            <button
              onClick={() => nav(-1)}
              className="px-4 py-2 rounded-2xl border border-purple-200 text-purple-700 font-semibold hover:bg-purple-50"
            >
              ← Back
            </button>
          </div>

          {loading ? <p className="mt-4 text-gray-600">Loading…</p> : null}
          {err ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{err}</div>
          ) : null}

          {!loading && ride ? (
            <>
              <div className="mt-6">
                <p className="font-semibold text-purple-800 mb-2">Who do you want to rate?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {participants.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => setToUserId(p._id)}
                      className={`text-left p-4 rounded-2xl border shadow-sm ${
                        toUserId === p._id
                          ? "border-purple-500 bg-purple-50"
                          : "border-purple-200 bg-white hover:bg-purple-50"
                      }`}
                    >
                      <div className="font-bold text-purple-800">{p.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Avg: {p.ratingAvg ?? 0} ({p.ratingCount ?? 0}) • Reliability: {p.reliabilityScore ?? 100}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="font-semibold text-purple-800 mb-2">Behavior</p>
                  <Stars value={behavior} onChange={setBehavior} />
                </div>
                <div>
                  <p className="font-semibold text-purple-800 mb-2">Punctuality</p>
                  <Stars value={punctuality} onChange={setPunctuality} />
                </div>
                <div>
                  <p className="font-semibold text-purple-800 mb-2">Safety</p>
                  <Stars value={safety} onChange={setSafety} />
                </div>

                <div>
                  <p className="font-semibold text-purple-800 mb-2">Comment (optional)</p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-purple-200 p-3 focus:ring-2 focus:ring-purple-300"
                    placeholder="Say something helpful (max 500 chars)…"
                    maxLength={500}
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-extrabold disabled:opacity-60"
                >
                  Submit rating
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
