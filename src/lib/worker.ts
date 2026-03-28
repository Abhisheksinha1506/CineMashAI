import { Worker, Job } from 'bullmq';
import { getRedisClient } from './redis';
import { generateFusion } from './groq';
import { enrichCastWithPhotos } from './cast-enrichment';
import { db } from './db';
import { fusions } from './schema';
import crypto from 'crypto';
import { getMovieDetails } from './tmdb-simple';
import { generateShareToken } from './ai-server';

const redis = getRedisClient();

/**
 * Worker Logic for generating CineMash fusions.
 * Handles the AI generation, cast enrichment, and DB persistence.
 */
export const fusionWorker = new Worker(
  'fusion-tasks',
  async (job: Job) => {
    const { movieIds, constraints, userId } = job.data;
    
    console.log(`[Worker] Starting job ${job.id} for user ${userId}`);
    
    try {
      // 1. Fetch movie details
      const moviesData = await Promise.all(
        movieIds.map((id: number) => getMovieDetails(id.toString()))
      );

      // 2. Generate Fusion (AI)
      const { fusionData, actorPool } = await generateFusion(moviesData as any, constraints);

      // 3. Enrich Cast Photos
      const enrichedCast = await enrichCastWithPhotos(
        (fusionData as any).suggestedCast || [],
        actorPool
      );

      const finalFusionData = {
        ...fusionData,
        suggestedCast: enrichedCast,
        suggested_cast: enrichedCast // Legacy compatibility
      };

      // 4. Save result to DB
      const shareToken = generateShareToken();
      await db.insert(fusions).values({
        id: crypto.randomUUID(),
        share_token: shareToken,
        movie_ids: JSON.stringify(movieIds.map((id: number) => id.toString())),
        fusion_data: JSON.stringify(finalFusionData),
        ip_hash: userId,
        created_at: new Date().toISOString(),
        upvotes: 0,
      });

      // 5. Invalidate gallery cache if needed
      // (This is usually better done via revalidatePath, but workers might not have sync access)

      return {
        ...finalFusionData,
        share_token: shareToken,
      };
    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error);
      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection: redis as any,
    // LIMITER: This is key! It prevents us from hitting Groq RPM limits.
    // 2 jobs per second (120 per minute) is safe for most standard tiers.
    limiter: {
      max: 2,
      duration: 1000,
    },
    concurrency: 1, // One job at a time per worker instance for maximum safety
  }
);

fusionWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job?.id} completed successfully.`);
});

fusionWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});
