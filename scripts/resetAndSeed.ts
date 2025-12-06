import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function main() {
  console.log("Resetting database and reseeding...");
  
  // Delete all existing data
  await prisma.order.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log("Database cleared. Running seed script...");
  
  // Run the seed script
  const { stdout, stderr } = await execAsync("npm run seed");
  console.log(stdout);
  if (stderr) console.error(stderr);
  
  console.log("Reset and seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

