import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all messages where user is either sender or receiver
    const allMessages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: session.user.id },
          { toUserId: session.user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Group messages by conversation partner
    const conversationMap = new Map<string, {
      userId: string;
      lastMessage?: any;
      unreadCount: number;
    }>();

    for (const message of allMessages) {
      const otherUserId = message.fromUserId === session.user.id 
        ? message.toUserId 
        : message.fromUserId;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      const conv = conversationMap.get(otherUserId)!;
      
      // Update last message if this one is newer
      if (!conv.lastMessage || new Date(message.createdAt) > new Date(conv.lastMessage.createdAt)) {
        conv.lastMessage = message;
      }

      // Count unread messages
      if (message.toUserId === session.user.id && !message.read) {
        conv.unreadCount++;
      }
    }

    // Fetch user info for each conversation
    const conversations = await Promise.all(
      Array.from(conversationMap.values()).map(async (conv) => {
        const user = await prisma.user.findUnique({
          where: { id: conv.userId },
          select: { id: true, name: true, email: true },
        });

        return {
          userId: conv.userId,
          userName: user?.name,
          userEmail: user?.email || "",
          lastMessage: conv.lastMessage?.content,
          lastMessageTime: conv.lastMessage?.createdAt,
          unreadCount: conv.unreadCount,
        };
      })
    );

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

