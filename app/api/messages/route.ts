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

    const searchParams = request.nextUrl.searchParams;
    const otherUserId = searchParams.get("otherUserId");

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId is required" },
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            fromUserId: session.user.id,
            toUserId: otherUserId,
          },
          {
            fromUserId: otherUserId,
            toUserId: session.user.id,
          },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        fromUserId: otherUserId,
        toUserId: session.user.id,
        read: false,
      },
      data: { read: true },
    });

    // Fetch user info for messages
    const messagesWithUsers = await Promise.all(
      messages.map(async (msg) => {
        const [fromUser, toUser] = await Promise.all([
          prisma.user.findUnique({
            where: { id: msg.fromUserId },
            select: { id: true, name: true, email: true },
          }),
          prisma.user.findUnique({
            where: { id: msg.toUserId },
            select: { id: true, name: true, email: true },
          }),
        ]);
        return { ...msg, fromUser, toUser };
      })
    );

    return NextResponse.json({ messages: messagesWithUsers });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

