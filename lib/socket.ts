import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { prisma } from "./db";

let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer) {
  if (io) return io;

  // Allow all origins in development, or use NEXTAUTH_URL in production
  const allowedOrigins = process.env.NODE_ENV === "production" 
    ? [process.env.NEXTAUTH_URL || "http://localhost:3000"]
    : true; // Allow all origins in development for mobile access

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true, // Allow Engine.IO v3 clients
  });

  io.use(async (socket, next) => {
    try {
      // For now, we'll get user from session token passed in auth
      // In production, verify JWT token properly
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

    socket.on("joinRoom", async ({ otherUserId }: { otherUserId: string }) => {
      if (!otherUserId) return;
      const roomName = getRoomName(userId, otherUserId);
      socket.join(roomName);
      console.log(`User ${userId} joined room ${roomName}`);
    });

    socket.on("sendMessage", async ({ toUserId, productId, content }: {
      toUserId: string;
      productId?: string;
      content: string;
    }) => {
      try {
        // Save message to database
        const message = await prisma.message.create({
          data: {
            fromUserId: userId,
            toUserId,
            productId,
            content,
            read: false,
          },
        });

        // Fetch user info for the message (MongoDB doesn't support relations)
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

        // Emit to room
        const roomName = getRoomName(userId, toUserId);
        console.log(`Emitting message to room: ${roomName}`);
        io!.to(roomName).emit("newMessage", messageWithUsers);
        
        // Log for debugging
        const roomSockets = await io!.in(roomName).fetchSockets();
        console.log(`Room ${roomName} has ${roomSockets.length} socket(s)`);
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

function getRoomName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `chat:${sorted[0]}:${sorted[1]}`;
}

export function getIO(): SocketIOServer | null {
  return io;
}
