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

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { buyerId: session.user.id },
          { sellerId: session.user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch buyer and seller info for each order
    const ordersWithUsers = await Promise.all(
      orders.map(async (order) => {
        const [buyer, seller] = await Promise.all([
          prisma.user.findUnique({
            where: { id: order.buyerId },
            select: { id: true, name: true, email: true },
          }),
          prisma.user.findUnique({
            where: { id: order.sellerId },
            select: { id: true, name: true, email: true },
          }),
        ]);
        return { ...order, buyer, seller };
      })
    );

    return NextResponse.json({ orders: ordersWithUsers });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

