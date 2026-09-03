const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log(await prisma.sender.findMany());
}
main().finally(() => prisma.$disconnect());
