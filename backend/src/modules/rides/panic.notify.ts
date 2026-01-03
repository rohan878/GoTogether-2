import { Notification } from "../notifications/notification.model";

export async function notifyRideMembersPanic(params: {
  rideId: string;
  riderId: string;
  passengerIds: string[];
  triggeredByName: string;
  lat: number;
  lng: number;
  fromAddr?: string;
  toAddr?: string;
}) {
  const allUserIds = [params.riderId, ...params.passengerIds].filter(Boolean);
  const mapUrl = `https://maps.google.com/?q=${params.lat},${params.lng}`;

  const body =
    `🚨 Panic alert triggered by ${params.triggeredByName}\n` +
    `Ride: ${params.fromAddr || "Origin"} → ${params.toAddr || "Destination"}\n` +
    `Map: ${mapUrl}`;

  // create notifications for everyone
  await Notification.insertMany(
    allUserIds.map((uid) => ({
      user: uid,
      type: "PANIC_ALERT",
      title: "🚨 PANIC ALERT",
      body,
      rideId: params.rideId,
      read: false,
    }))
  );
}
