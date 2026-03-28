/**
 * scripts/worker-dev.ts
 * 
 * Standalone worker for processing CineMash AI fusion jobs in development.
 * Run this in a separate terminal with:
 * npx ts-node -P tsconfig.json -r tsconfig-paths/register src/lib/worker.ts
 */

import '../src/lib/worker';

console.log('--------------------------------------------');
console.log('🚀 CineMash AI Background Worker Started');
console.log('📡 Listening for "fusion-tasks" queue...');
console.log('⚙️ Concurrency: 1 | Rate Limit: 2 jobs/sec');
console.log('--------------------------------------------');

// Prevent the process from exiting
process.stdin.resume();

process.on('SIGINT', () => {
  console.log('Stopping worker...');
  process.exit(0);
});
