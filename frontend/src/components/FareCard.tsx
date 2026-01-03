type Props = {
  // new style (your ChatPage)
  rideId?: string;
  quote?: any;
  isRider?: boolean;
  onReload?: () => Promise<void> | void;

  // old style (optional)
  fareData?: any;
  seatsWanted?: number;
  acceptedCount?: number;
};

function pickNumber(obj: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export default function FareCard(props: Props) {
  const data = props.quote ?? props.fareData ?? {};

  const totalFare =
    pickNumber(data, ["totalFare", "total", "fare", "amount"]) ??
    pickNumber(data?.fareQuote, ["totalFare", "total", "fare", "amount"]) ??
    null;

  const distanceKm =
    pickNumber(data, ["distanceKm"]) ??
    (pickNumber(data, ["distanceMeters"]) ? data.distanceMeters / 1000 : null) ??
    pickNumber(data?.fareQuote, ["distanceKm"]) ??
    null;

  const people =
    (props.acceptedCount && props.acceptedCount > 0 ? props.acceptedCount : null) ??
    props.seatsWanted ??
    1;

  const perPerson = totalFare !== null ? totalFare / people : null;

  return (
    <div className="rounded-3xl border border-purple-200 bg-white/70 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-extrabold text-purple-700">💸 Fare</div>
        {props.onReload && (
          <button
            onClick={() => props.onReload?.()}
            className="rounded-2xl border-2 border-purple-200 bg-white px-4 py-2 font-semibold text-purple-700 hover:bg-purple-50"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-purple-200 bg-white p-4">
          <div className="text-sm text-slate-500">Total Fare</div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {totalFare === null ? "—" : `৳ ${Math.round(totalFare)}`}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-white p-4">
          <div className="text-sm text-slate-500">Per Person</div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {perPerson === null ? "—" : `৳ ${Math.round(perPerson)}`}
          </div>
        </div>

        <div className="col-span-2 rounded-2xl border border-purple-200 bg-white p-4">
          <div className="text-sm text-slate-500">Distance</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {distanceKm === null ? "—" : `${distanceKm.toFixed(2)} km`}
          </div>
        </div>
      </div>
    </div>
  );
}
