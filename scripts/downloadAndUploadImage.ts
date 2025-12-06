import { uploadImage } from "../lib/gridfs";

/**
 * Download an image from URL and upload to GridFS
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  filename: string
): Promise<string> {
  try {
    // Download image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Get image as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get content type from response or default to jpeg
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Upload to GridFS
    const fileId = await uploadImage(buffer, filename, contentType);

    return fileId;
  } catch (error) {
    console.error(`Error downloading/uploading image from ${imageUrl}:`, error);
    throw error;
  }
}

