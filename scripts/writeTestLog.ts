import { logActivity } from '../src/utils/logger';

async function main() {
  await logActivity(null, 'TEST_LOG', 'Testing log insertion from script');
  console.log('Called logActivity');
}

main().catch((e) => {
  console.error('Error writing test log:', e);
  process.exit(1);
});
