import http from "http";
import dotenv from "dotenv";
import mongoose from "mongoose";

import app from "./app";
import { attachSocketServer } from "./socket";
import { startPickupScheduler } from "./modules/rides/pickup.scheduler";
import { startScheduledRideReminderScheduler } from "./modules/rides/scheduledRide.scheduler";

dotenv.config();

const PORT = Number(process.env.PORT || 1577);
const MONGO_URI = process.env.MONGO_URI || "";

async function start() {
  try {
    if (!MONGO_URI) {
      console.error("❌ MONGO_URI missing in backend .env");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    const server = http.createServer(app);
    attachSocketServer(server);

    // ✅ start background schedulers AFTER DB is ready
    startPickupScheduler();
    startScheduledRideReminderScheduler();

    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server start failed:", err);
    process.exit(1);
  }
}

start();
