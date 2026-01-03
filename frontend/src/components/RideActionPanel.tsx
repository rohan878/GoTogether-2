import api from "../lib/api";

type Props = {
  rideId: string;
  isExpired: boolean;
};

export default function RideActionPanel({ rideId, isExpired }: Props) {
  if (!isExpired) return null;

  const act = async (action: "START" | "CANCEL" | "WAIT_MORE") => {
    await api.post(`/api/rides/${rideId}/pickup/decide`, {
      action,
      extraSeconds: action === "WAIT_MORE" ? 120 : undefined,
    });
  };

  return (
    <div className="mt-4 rounded-xl bg-white p-4 border border-purple-200 shadow-sm">
      <p className="font-semibold text-purple-800 mb-2">Rider Action Required</p>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => act("START")}
          className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
        >
          Start Ride
        </button>

        <button
          onClick={() => act("WAIT_MORE")}
          className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
        >
          Wait 2 more mins
        </button>

        <button
          onClick={() => act("CANCEL")}
          className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
        >
          Cancel Ride
        </button>
      </div>
    </div>
  );
}
