import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./modules/auth/auth.routes";
import adminRoutes from "./modules/admin/admin.routes";
import rideRoutes from "./modules/rides/ride.routes";
import chatRoutes from "./modules/chat/chat.routes";
import fareRoutes from "./modules/fare/fare.routes";
import locationRoutes from "./modules/locations/location.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import cronRoutes from "./routes/cron.routes";
import ratingRoutes from "./modules/ratings/rating.routes";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Server is healthy ✅" });
});

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/fare", fareRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/cron", cronRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("❌ API Error:", err);
  res.status(err?.statusCode || 500).json({
    message: err?.message || "Internal Server Error",
  });
});

export default app;
