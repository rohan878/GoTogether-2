import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { ChatRoom } from "./modules/chat/chat.room.model";
import { Message } from "./modules/chat/message.model";
import { Ride } from "./modules/rides/ride.model";
import { getDistanceInMeters } from "./utils/distance";

type JwtPayload = { userId: string };

let ioRef: Server | null = null;

export function emitSystemMessage(rideId: string, text: string, meta?: any) {
  if (!ioRef) return;

  ioRef.to(rideId).emit("ride:system", { ok: true, rideId, text, meta: meta || null });

  ioRef.to(rideId).emit("chat:new", {
    _id: `sys-${Date.now()}`,
    rideId,
    type: "SYSTEM",
    text,
    sender: null,
    createdAt: new Date().toISOString(),
    meta: meta || null,
  });
}

export function attachSocketServer(server: HTTPServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
  });

  ioRef = io;

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers.authorization as string)?.replace("Bearer ", "");

      if (!token) return next(new Error("Unauthorized"));

      const secret = process.env.JWT_SECRET || "secret";
      const decoded = jwt.verify(token, secret) as JwtPayload;
      (socket as any).userId = decoded.userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("chat:join", async (rideId: string, cb?: (resp: any) => void) => {
      try {
        const userId = (socket as any).userId as string;

        const room = await ChatRoom.findOne({ rideId });
        if (!room) return cb?.({ ok: false, message: "Room not found" });

        const isMember = room.members.some((m: any) => String(m) === String(userId));
        if (!isMember) return cb?.({ ok: false, message: "Not allowed" });

        socket.join(rideId);
        cb?.({ ok: true });
      } catch (e: any) {
        cb?.({ ok: false, message: e?.message || "Join failed" });
      }
    });

    socket.on(
      "chat:send",
      async (payload: { rideId: string; text: string }, cb?: (resp: any) => void) => {
        try {
          const userId = (socket as any).userId as string;
          const rideId = String(payload?.rideId || "");
          const text = String(payload?.text || "").trim();
          if (!rideId || !text) return cb?.({ ok: false, message: "rideId/text required" });

          const room = await ChatRoom.findOne({ rideId });
          if (!room) return cb?.({ ok: false, message: "Room not found" });

          const isMember = room.members.some((m: any) => String(m) === String(userId));
          if (!isMember) return cb?.({ ok: false, message: "Not allowed" });

          const created = await Message.create({
            rideId,
            type: "TEXT",
            sender: userId,
            text,
          });

          const msg = await Message.findById(created._id)
            .populate("sender", "name gender photo")
            .lean();

          io.to(rideId).emit("chat:new", msg);
          cb?.({ ok: true, message: msg });
        } catch (e: any) {
          cb?.({ ok: false, message: e?.message || "Send failed" });
        }
      }
    );

    socket.on("group:join", (groupId: string) => socket.join(groupId));
    socket.on("group:leave", (groupId: string) => socket.leave(groupId));

    // Module 4 Member-3: dynamic distance from passenger to pickup point
    // Client emits: ride:location:update { rideId, lat, lng }
    socket.on(
      "ride:location:update",
      async (payload: { rideId: string; lat: number; lng: number }, cb?: (r: any) => void) => {
        try {
          const userId = (socket as any).userId as string;
          const rideId = String(payload?.rideId || "");
          const lat = Number(payload?.lat);
          const lng = Number(payload?.lng);
          if (!rideId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            return cb?.({ ok: false, message: "rideId/lat/lng required" });
          }

          // membership check via chat room (same membership rules as chat)
          const room = await ChatRoom.findOne({ rideId });
          if (!room) return cb?.({ ok: false, message: "Room not found" });
          const isMember = room.members.some((m: any) => String(m) === String(userId));
          if (!isMember) return cb?.({ ok: false, message: "Not allowed" });

          const ride = await Ride.findById(rideId).select("origin").lean();
          if (!ride?.origin) return cb?.({ ok: false, message: "Ride not found" });

          const d = getDistanceInMeters(lat, lng, Number((ride as any).origin.lat), Number((ride as any).origin.lng));
          io.to(rideId).emit("ride:distance:update", {
            ok: true,
            rideId,
            userId,
            distanceMeters: Math.round(d),
            at: new Date().toISOString(),
          });

          cb?.({ ok: true });
        } catch (e: any) {
          cb?.({ ok: false, message: e?.message || "Update failed" });
        }
      }
    );
  });

  return io;
}
