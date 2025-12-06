import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const checkoutSchema = z.object({
  productIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = checkoutSchema.parse(body);

    // Get products
    const products = await prisma.product.findMany({
      where: {
        id: { in: validatedData.productIds },
        isActive: true,
      },
    });

    if (products.length !== validatedData.productIds.length) {
      return NextResponse.json(
        { error: "Some products not found" },
        { status: 400 }
      );
    }

    // Calculate total
    const total = products.reduce((sum, product) => sum + product.price, 0);

    // Get seller IDs (assuming all products from same seller for simplicity)
    const sellerId = products[0].sellerId;

    // Create order
    const order = await prisma.order.create({
      data: {
        buyerId: session.user.id,
        sellerId,
        productIds: validatedData.productIds,
        total,
        status: "pending",
      },
    });

    // Fetch buyer and seller info
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

    return NextResponse.json({ ...order, buyer, seller }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

