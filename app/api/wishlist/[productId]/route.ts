import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isInWishlist = user.wishlist.includes(productId);

    if (isInWishlist) {
      // Remove from wishlist
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          wishlist: {
            set: user.wishlist.filter((id) => id !== productId),
          },
        },
      });

      // Decrement wish count
      await prisma.product.update({
        where: { id: productId },
        data: { wishCount: { decrement: 1 } },
      });

      return NextResponse.json({ message: "Removed from wishlist", inWishlist: false });
    } else {
      // Add to wishlist
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          wishlist: {
            push: productId,
          },
        },
      });

      // Increment wish count
      await prisma.product.update({
        where: { id: productId },
        data: { wishCount: { increment: 1 } },
      });

      return NextResponse.json({ message: "Added to wishlist", inWishlist: true });
    }
  } catch (error) {
    console.error("Wishlist toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

