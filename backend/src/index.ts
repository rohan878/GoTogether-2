import http from "http";
import mongoose from "mongoose";
import app from "./app";
import { attachSocketServer } from "./socket";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

async function bootstrap() {
  const mongo = process.env.MONGO_URI;
  if (!mongo) throw new Error("MONGO_URI missing");

  await mongoose.connect(mongo);
  console.log("✅ MongoDB connected");

  const server = http.createServer(app);

  // ✅ Socket.IO attach
  attachSocketServer(server);

  server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap error:", err);
  process.exit(1);
});
