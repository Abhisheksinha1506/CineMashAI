import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { generateFusion } from "@/lib/groq";
import { enrichCastWithPhotos } from "@/lib/cast-enrichment";
import { db } from "@/lib/db";
import { fusions } from "@/lib/schema";
import crypto from "crypto";
import { getMovieDetails } from "@/lib/tmdb-simple";
import { generateShareToken } from "@/lib/ai-server";

/**
 * CineMash AI Serverless Worker.
 * Triggered by QStash to process fusion requests in the background on Vercel.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log("[Worker] Fusion Task Received");

  // 1. Signature Verification (Security)
  // Ensure the request is actually coming from QStash
  const signature = req.headers.get("upstash-signature");
  if (!signature && process.env.NODE_ENV === "production") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (process.env.NODE_ENV === "production") {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
    });

    const body = await req.text();
    const isValid = await receiver.verify({
      signature: signature || "",
      body,
    }).catch(() => false);

    if (!isValid) {
      return new NextResponse("Invalid Signature", { status: 401 });
    }
  }

  // 2. Process Job
  try {
    const body = await req.json();
    const { movieIds, constraints, userId } = body;

    if (!movieIds || !Array.isArray(movieIds)) {
      throw new Error("Invalid payload: movieIds missing");
    }

    console.log(`[Worker] Starting fusion for user ${userId} | Movies: ${movieIds.join(", ")}`);

    // 2.1 Fetch movie details (Optimized with parallel execution)
    const moviesData = await Promise.all(
      movieIds.map((id: number) => getMovieDetails(id.toString()))
    );

    // 2.2 Generate Fusion (AI)
    // Note: llama-3.3-70b-versatile is extremely fast on Groq (< 2-3s)
    const { fusionData, actorPool } = await generateFusion(moviesData as any, constraints);

    // 2.3 Enrich Cast Photos (Optimized parallel enrichment)
    const enrichedCast = await enrichCastWithPhotos(
      (fusionData as any).suggestedCast || [],
      actorPool
    );

    const finalFusionData = {
      ...fusionData,
      suggestedCast: enrichedCast,
      suggested_cast: enrichedCast
    };

    // 2.4 Persistence
    const shareToken = generateShareToken();
    const fusionId = crypto.randomUUID();

    await db.insert(fusions).values({
      id: fusionId,
      share_token: shareToken,
      movie_ids: JSON.stringify(movieIds.map((id: number) => id.toString())),
      fusion_data: JSON.stringify(finalFusionData),
      ip_hash: userId,
      created_at: new Date().toISOString(),
      upvotes: 0,
    });

    const duration = Date.now() - startTime;
    console.log(`[Worker] Fusion complete! ID: ${fusionId} | Duration: ${duration}ms`);

    return NextResponse.json({
      success: true,
      id: fusionId,
      share_token: shareToken,
      duration_ms: duration
    });

  } catch (error: any) {
    console.error("[Worker] Fatal processing error:", error);
    
    // QStash will retry based on status code (non-2xx)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Ensure the function timeout is maximized if on Pro (not applicable to Free, but good practice)
export const maxDuration = 60; 
