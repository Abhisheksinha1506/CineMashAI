import { Queue } from 'bullmq';
import { getRedisClient } from './redis';

const redis = getRedisClient();

// Configuration for the fusion queue
export const FUSION_QUEUE_NAME = 'fusion-tasks';

/**
 * Singleton Queue instance for adding fusion jobs.
 */
export const fusionQueue = new Queue(FUSION_QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * High-level helper to add a fusion job to the queue.
 */
export async function addFusionJob(data: {
  movieIds: number[];
  constraints?: string;
  userId: string;
}) {
  return await fusionQueue.add('generate-fusion', data, {
    // Ensuring single user doesn't flood the queue (optional prioritization)
    jobId: `fuse-${data.userId}-${Date.now()}`,
  });
}
