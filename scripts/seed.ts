import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { downloadAndUploadImage } from "./downloadAndUploadImage";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create users
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user1 = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      password: hashedPassword,
      wishlist: [],
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Smith",
      password: hashedPassword,
      wishlist: [],
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "charlie@example.com" },
    update: {},
    create: {
      email: "charlie@example.com",
      name: "Charlie Brown",
      password: hashedPassword,
      wishlist: [],
    },
  });

  console.log("Created users:", { user1, user2, user3 });

  // Delete all existing products first
  console.log("Deleting existing products...");
  await prisma.product.deleteMany({});
  console.log("Deleted all existing products");

  console.log("Downloading and uploading product images from internet...");

  // Create products with real images from internet
  const productsData = [
    {
      title: "MacBook Pro 13 inch",
      description: "Excellent condition MacBook Pro. Used for 1 year. All accessories included.",
      price: 75000,
      sellerId: user1.id,
      category: "Electronics",
      location: "Mumbai",
      condition: "Like New",
      imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop",
    },
    {
      title: "iPhone 12 Pro",
      description: "128GB, Space Gray. Original box and charger included.",
      price: 45000,
      sellerId: user1.id,
      category: "Electronics",
      location: "Mumbai",
      condition: "Good",
      imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=600&fit=crop",
    },
    {
      title: "Sony WH-1000XM4 Headphones",
      description: "Noise cancelling headphones. Perfect condition.",
      price: 18000,
      sellerId: user2.id,
      category: "Electronics",
      location: "Delhi",
      condition: "New",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop",
    },
    {
      title: "Nike Air Max 270",
      description: "Size 10, worn only a few times. Like new condition.",
      price: 6000,
      sellerId: user2.id,
      category: "Fashion",
      location: "Delhi",
      condition: "Like New",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop",
    },
    {
      title: "IKEA Study Desk",
      description: "White study desk. Good condition. Pickup only.",
      price: 3500,
      sellerId: user3.id,
      category: "Furniture",
      location: "Bangalore",
      condition: "Good",
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
    },
    {
      title: "Canon EOS R5 Camera",
      description: "Professional camera with 24-70mm lens. Excellent condition.",
      price: 250000,
      sellerId: user3.id,
      category: "Electronics",
      location: "Bangalore",
      condition: "Like New",
      imageUrl: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=600&fit=crop",
    },
    {
      title: "Guitar - Fender Stratocaster",
      description: "Electric guitar. Perfect for beginners and professionals.",
      price: 35000,
      sellerId: user1.id,
      category: "Musical Instruments",
      location: "Mumbai",
      condition: "Good",
      imageUrl: "https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800&h=600&fit=crop",
    },
    {
      title: "Samsung 55 inch 4K TV",
      description: "Smart TV with all streaming apps. Wall mount included.",
      price: 45000,
      sellerId: user2.id,
      category: "Electronics",
      location: "Delhi",
      condition: "Like New",
      imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&h=600&fit=crop",
    },
    {
      title: "Vintage Leather Jacket",
      description: "Genuine leather jacket. Size M. Classic style.",
      price: 8000,
      sellerId: user3.id,
      category: "Fashion",
      location: "Bangalore",
      condition: "Good",
      imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=600&fit=crop",
    },
    {
      title: "Gaming Chair - Secretlab",
      description: "Ergonomic gaming chair. Black color. Excellent condition.",
      price: 12000,
      sellerId: user1.id,
      category: "Furniture",
      location: "Mumbai",
      condition: "Like New",
      imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=600&fit=crop",
    },
  ];

  // Download images and create products
  for (const productData of productsData) {
    try {
      const { imageUrl, ...productInfo } = productData;
      
      // Download and upload image from internet
      console.log(`Downloading image for: ${productData.title}...`);
      const imageId = await downloadAndUploadImage(
        imageUrl,
        `${productData.title.replace(/\s+/g, "-").toLowerCase()}.jpg`
      );
      
      // Create product with image
      await prisma.product.create({
        data: {
          ...productInfo,
          images: [imageId],
        },
      });
      console.log(`✓ Created product: ${productData.title} with real image`);
    } catch (error) {
      console.error(`✗ Error creating product ${productData.title}:`, error);
      // Create product without image if download fails
      const { imageUrl, ...productInfo } = productData;
      await prisma.product.create({
        data: productInfo,
      });
      console.log(`  Created product without image as fallback`);
    }
  }

  console.log("Created 10 products with images");

  // Create sample messages
  const message1 = await prisma.message.create({
    data: {
      fromUserId: user2.id,
      toUserId: user1.id,
      productId: (await prisma.product.findFirst({ where: { sellerId: user1.id } }))?.id,
      content: "Hi, is this still available?",
      read: false,
    },
  });

  const message2 = await prisma.message.create({
    data: {
      fromUserId: user1.id,
      toUserId: user2.id,
      productId: (await prisma.product.findFirst({ where: { sellerId: user1.id } }))?.id,
      content: "Yes, it's available. When would you like to see it?",
      read: false,
    },
  });

  console.log("Created sample messages");

  // Create sample orders
  const product1 = await prisma.product.findFirst({ where: { sellerId: user1.id } });
  if (product1) {
    await prisma.order.create({
      data: {
        buyerId: user2.id,
        sellerId: user1.id,
        productIds: [product1.id],
        total: product1.price,
        status: "pending",
      },
    });
    console.log("Created sample order");
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

