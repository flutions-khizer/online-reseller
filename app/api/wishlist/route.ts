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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { wishlist: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: user.wishlist },
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch seller info for each product
    const productsWithSellers = await Promise.all(
      products.map(async (product) => {
        const seller = await prisma.user.findUnique({
          where: { id: product.sellerId },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
        return { ...product, seller };
      })
    );

    return NextResponse.json({ products: productsWithSellers });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

