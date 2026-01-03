import { usePickupTimer } from "../hooks/usePickupTimer";

type Props = {
  deadline?: string | null;
};

export default function PickupCountdown({ deadline }: Props) {
  if (!deadline) return null;

  const { remaining, expired } = usePickupTimer(deadline);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-purple-100 p-5 shadow-sm border border-purple-200">
      {!expired ? (
        <>
          <p className="text-purple-700 font-semibold mb-1">
            ⏳ Waiting at pickup point
          </p>
          <p className="text-3xl font-extrabold text-purple-900">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </p>
          <p className="text-sm text-purple-600">
            Please arrive before timer ends
          </p>
        </>
      ) : (
        <p className="text-red-600 font-semibold">
          ⏰ Pickup time ended — Rider decision required
        </p>
      )}
    </div>
  );
}
