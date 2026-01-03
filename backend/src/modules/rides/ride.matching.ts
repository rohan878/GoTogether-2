import { Location } from "../locations/location.model";
import { getDistanceInMeters } from "../../utils/distance";

export const findNearbyUsers = async (
  riderLat: number,
  riderLng: number,
  radiusMeters: number,
  riderId: string
) => {
  const locations = await Location.find({
    userId: { $ne: riderId } // exclude rider
  });

  const nearbyUsers = [];

  for (const loc of locations) {
    const distance = getDistanceInMeters(
      riderLat,
      riderLng,
      loc.lat,
      loc.lng
    );

    if (distance <= radiusMeters) {
      nearbyUsers.push({
        userId: loc.userId,
        distance: Math.round(distance),
      });
    }
  }

  return nearbyUsers;
};
