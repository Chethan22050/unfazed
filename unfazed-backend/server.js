const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const therapistRoutes = require("./src/routes/therapistRoutes");
const schedulingRoutes = require("./src/routes/schedulingRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const noteRoutes = require("./src/routes/noteRoutes");
const portalRoutes = require("./src/routes/portalRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const entitlementRoutes = require("./src/routes/entitlementRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const { configureChatSocket } = require("./src/sockets/chatSocket");
const { setSocketServer } = require("./src/sockets/socketHub");
const { startNotificationScheduler } = require("./src/services/notificationScheduler");
const { seedDefaultTiers } = require("./src/services/tierSeedService");

const app = express();

app.use(cors());
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/therapists", therapistRoutes);
app.use("/api/scheduling", schedulingRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/entitlements", entitlementRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Unfazed Backend is running"
  });
});
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173").split(","),
    methods: ["GET", "POST"]
  }
});
setSocketServer(io);
configureChatSocket(io);

connectDB().then(async () => {
  await seedDefaultTiers();
  startNotificationScheduler();
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});