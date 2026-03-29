import { Client } from "@upstash/qstash";

/**
 * QStash Client for Serverless Background Tasks.
 * This replaces BullMQ for Vercel-native deployments.
 */
export const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
  baseUrl: process.env.QSTASH_URL || undefined,
});

if (!process.env.QSTASH_TOKEN) {
  console.warn("[QStash] Warning: QSTASH_TOKEN is missing from environment.");
}

/**
 * Publishes a task to the serverless worker.
 * 
 * @param data - The fusion task data (movieIds, constraints, userId)
 */
export async function pushFusionTask(data: {
  movieIds: number[];
  constraints?: string;
  userId: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const workerUrl = `${baseUrl}/api/fuse/worker`;

  const maskedToken = (process.env.QSTASH_TOKEN || "").substring(0, 8) + "...";
  console.log(`[QStash] Token Presence: ${process.env.QSTASH_TOKEN ? "YES" : "NO"} (${maskedToken})`);
  console.log(`[QStash] Publishing task to ${workerUrl}`);

  try {
    const res = await qstash.publishJSON({
      url: workerUrl,
      body: data,
      retries: 2,
    });
    console.log(`[QStash] Enqueued: ${res.messageId}`);
    return res;
  } catch (error: any) {
    console.error(`[QStash] Publish failed:`, error.message);
    throw error;
  }
}
