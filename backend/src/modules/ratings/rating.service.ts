import { User } from "../auth/auth.model";

// Updates the recipient's rolling average rating and reliability/discount.
export async function applyReceivedRating(toUserId: string, compositeScore: number) {
  const user = await User.findById(toUserId);
  if (!user) return;

  const prevCount = Number((user as any).ratingCount || 0);
  const prevAvg = Number((user as any).ratingAvg || 0);
  const newCount = prevCount + 1;
  const newAvg = (prevAvg * prevCount + compositeScore) / newCount;
  (user as any).ratingCount = newCount;
  (user as any).ratingAvg = Math.round(newAvg * 100) / 100;

  recalcReliabilityAndDiscount(user);
  await user.save();
}

export function recalcReliabilityAndDiscount(user: any) {
  const cancellations = Number(user.cancellations || 0);
  const completedRides = Number(user.completedRides || 0);
  const ratingAvg = Number(user.ratingAvg || 0);

  // Soft penalty: each cancellation reduces score by 10, but keep within 0..100
  const reliabilityScore = Math.max(0, Math.min(100, 100 - cancellations * 10));
  user.reliabilityScore = reliabilityScore;

  // Rewards: simple tiered discount if reliable
  // (You can adjust thresholds as needed)
  let discountPct = 0;
  if (reliabilityScore >= 80 && ratingAvg >= 3.8) {
    if (completedRides >= 20) discountPct = 10;
    else if (completedRides >= 10) discountPct = 5;
  }
  user.discountPct = discountPct;
}
