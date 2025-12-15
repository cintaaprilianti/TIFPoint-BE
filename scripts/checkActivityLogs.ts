import prisma from '../src/utils/prisma';

async function main() {
  const count = await (prisma as any).activityLog.count();
  console.log('ActivityLog count:', count);
  const rows = await (prisma as any).activityLog.findMany({ take: 10, orderBy: { timestamp: 'desc' } });
  console.log('Recent logs:', rows);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error querying ActivityLog:', e);
  prisma.$disconnect();
  process.exit(1);
});
