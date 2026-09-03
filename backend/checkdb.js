const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sender = await prisma.sender.findUnique({where: {id: 'e260282b-e6e2-4840-baa8-3b5acd7bf89b'}});
  console.log(sender);
}
main().finally(() => prisma.$disconnect());
