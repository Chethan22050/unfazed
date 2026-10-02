const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
const { getSocketServer } = require("../sockets/socketHub");

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
  });
};

const notifyEvent = async ({ therapistId, client, session, event, eventKey, title, message }) => {
  let notification;
  try {
    notification = await Notification.create({
      therapist: therapistId,
      client: client?._id || client,
      session: session?._id || session || null,
      event,
      eventKey,
      title,
      message,
      channels: { inApp: "sent", email: "skipped", whatsapp: "stubbed" }
    });
  } catch (error) {
    if (error.code === 11000) return Notification.findOne({ eventKey });
    throw error;
  }

  const io = getSocketServer();
  io?.to(`therapist:${therapistId}`).emit("notification:new", notification);
  if (client?._id || client) {
    const clientId = (client?._id || client).toString();
    io?.to(`care:${therapistId}:${clientId}`).emit("notification:new", notification);
  }

  const transporter = getTransporter();
  const recipient = client?.email;
  if (transporter && recipient) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipient,
        subject: title,
        text: message
      });
      await Notification.updateOne({ _id: notification._id }, { $set: { "channels.email": "sent" } });
    } catch {
      await Notification.updateOne({ _id: notification._id }, { $set: { "channels.email": "failed" } });
    }
  }

  return notification;
};

module.exports = { notifyEvent };