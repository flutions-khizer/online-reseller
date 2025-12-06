const { Server: SocketIOServer } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
let io = null;

function initializeSocket(server) {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth.userId;
      if (!userId) {
        return next(new Error("Authentication error"));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user.id;

    socket.on("joinRoom", async ({ otherUserId }) => {
      const roomName = getRoomName(userId, otherUserId);
      socket.join(roomName);
    });

    socket.on("sendMessage", async ({ toUserId, productId, content }) => {
      try {
        const message = await prisma.message.create({
          data: {
            fromUserId: userId,
            toUserId,
            productId,
            content,
            read: false,
          },
        });

        const [fromUser, toUser] = await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true },
          }),
          prisma.user.findUnique({
            where: { id: toUserId },
            select: { id: true, name: true, email: true },
          }),
        ]);

        const messageWithUsers = { ...message, fromUser, toUser };

        const roomName = getRoomName(userId, toUserId);
        io.to(roomName).emit("newMessage", messageWithUsers);

        socket.to(toUserId).emit("messageNotification", {
          fromUserId: userId,
          fromUserName: socket.data.user.name,
          content,
          productId,
        });
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}

function getRoomName(userId1, userId2) {
  const sorted = [userId1, userId2].sort();
  return `chat:${sorted[0]}:${sorted[1]}`;
}

function getIO() {
  return io;
}

module.exports = { initializeSocket, getIO };

