import { MongoClient, GridFSBucket, ObjectId } from "mongodb";

let client: MongoClient | null = null;
let bucket: GridFSBucket | null = null;

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (bucket) return bucket;

  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error("MONGO_URL environment variable is not set");
  }

  client = new MongoClient(mongoUrl);
  await client.connect();

  const db = client.db();
  bucket = new GridFSBucket(db, { bucketName: "productImages" });

  return bucket;
}

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const gridFSBucket = await getGridFSBucket();
  const uploadStream = gridFSBucket.openUploadStream(filename, {
    metadata: { contentType },
  } as any);

  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => {
      resolve(uploadStream.id.toString());
    });
    uploadStream.on("error", reject);
    uploadStream.end(buffer);
  });
}

export async function getImageStream(fileId: string): Promise<NodeJS.ReadableStream> {
  const gridFSBucket = await getGridFSBucket();
  try {
    const objectId = new ObjectId(fileId);
    return gridFSBucket.openDownloadStream(objectId);
  } catch (error) {
    throw new Error("File not found");
  }
}

export async function getImageMetadata(fileId: string): Promise<{ contentType?: string } | null> {
  try {
    const gridFSBucket = await getGridFSBucket();
    const objectId = new ObjectId(fileId);
    
    // GridFS stores file metadata in the files collection
    const db = (gridFSBucket as any).s.db;
    const filesCollection = db.collection("productImages.files");
    const fileDoc = await filesCollection.findOne({ _id: objectId });
    
    if (!fileDoc) {
      return null;
    }
    
    return {
      contentType: fileDoc.contentType || "image/jpeg",
    };
  } catch (error) {
    return null;
  }
}

export async function deleteImage(fileId: string): Promise<void> {
  const gridFSBucket = await getGridFSBucket();
  const objectId = new ObjectId(fileId);
  await gridFSBucket.delete(objectId);
}

