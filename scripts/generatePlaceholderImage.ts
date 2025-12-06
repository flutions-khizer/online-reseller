import sharp from "sharp";
import { uploadImage } from "../lib/gridfs";

/**
 * Generate a simple placeholder image with text
 */
export async function generatePlaceholderImage(
  text: string,
  width: number = 800,
  height: number = 600
): Promise<string> {
  // Create a simple colored background
  const backgroundColor = "#E5E7EB"; // gray-200
  const textColor = "#6B7280"; // gray-500

  // Create SVG with text
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="32" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${text}
      </text>
    </svg>
  `;

  // Convert SVG to PNG buffer
  const buffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  // Upload to GridFS
  const fileId = await uploadImage(
    buffer,
    `placeholder-${text.replace(/\s+/g, "-").toLowerCase()}.png`,
    "image/png"
  );

  return fileId;
}

