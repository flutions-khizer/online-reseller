import { NextRequest, NextResponse } from "next/server";
import { getImageStream, getImageMetadata } from "@/lib/gridfs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stream = await getImageStream(id);
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Try to get content type from metadata
    let contentType = "image/jpeg";
    try {
      const metadata = await getImageMetadata(id);
      if (metadata?.contentType) {
        contentType = metadata.contentType;
      }
    } catch (e) {
      // Use default if metadata fetch fails
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    if (error.message?.includes("FileNotFound") || error.message?.includes("not found") || error.message?.includes("File not found")) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    console.error("Get image error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

