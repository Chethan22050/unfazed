const jwt = require("jsonwebtoken");
const Client = require("../models/Client");
const Message = require("../models/Message");

const roomName = (therapistId, clientId) => `care:${therapistId}:${clientId}`;

const configureChatSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === "client" && decoded.clientId && decoded.therapistId) {
        socket.user = { role: "client", clientId: decoded.clientId, therapistId: decoded.therapistId };
      } else if (decoded.id) {
        socket.user = { role: "therapist", therapistId: decoded.id };
      } else {
        return next(new Error("Invalid chat access token"));
      }
      return next();
    } catch {
      return next(new Error("Chat authentication required"));
    }
  });

  io.on("connection", (socket) => {
    if (socket.user.role === "therapist") socket.join(`therapist:${socket.user.therapistId}`);

    socket.on("conversation:join", async ({ clientId } = {}, acknowledge = () => {}) => {
      try {
        const requestedClientId = socket.user.role === "client" ? socket.user.clientId : clientId;
        if (!requestedClientId) return acknowledge({ error: "Client id is required" });
        const filter = { _id: requestedClientId, therapist: socket.user.therapistId };
        if (socket.user.role === "client") filter._id = socket.user.clientId;
        const client = await Client.findOne(filter).select("_id").lean();
        if (!client) return acknowledge({ error: "Conversation not found" });
        socket.clientId = client._id.toString();
        socket.join(roomName(socket.user.therapistId, client._id));
        return acknowledge({ joined: true, clientId: socket.clientId });
      } catch {
        return acknowledge({ error: "Could not join conversation" });
      }
    });

    socket.on("message:send", async ({ body } = {}, acknowledge = () => {}) => {
      try {
        if (!socket.clientId) return acknowledge({ error: "Join a conversation first" });
        if (typeof body !== "string" || !body.trim() || body.trim().length > 5000) {
          return acknowledge({ error: "Message must contain 1 to 5000 characters" });
        }
        const senderId = socket.user.role === "client" ? socket.user.clientId : socket.user.therapistId;
        const message = await Message.create({
          therapist: socket.user.therapistId,
          client: socket.clientId,
          senderRole: socket.user.role,
          senderId,
          body: body.trim()
        });
        const payload = {
          _id: message._id,
          client: message.client,
          senderRole: message.senderRole,
          body: message.body,
          createdAt: message.createdAt
        };
        io.to(roomName(socket.user.therapistId, socket.clientId)).emit("message:new", payload);
        return acknowledge({ message: payload });
      } catch {
        return acknowledge({ error: "Message could not be sent" });
      }
    });
  });
};

module.exports = { configureChatSocket, roomName };