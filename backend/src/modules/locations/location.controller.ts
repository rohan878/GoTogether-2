import { Request, Response } from "express";
import { Location } from "./location.model";

export const upsertLocation = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { lat, lng } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ message: "lat and lng required" });
    }

    const location = await Location.findOneAndUpdate(
      { userId: user._id },
      { lat, lng, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json(location);
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};