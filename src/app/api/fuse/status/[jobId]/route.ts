import { NextRequest, NextResponse } from 'next/server';
import { fusionQueue } from '@/lib/queue';

/**
 * GET /api/fuse/status/[jobId]
 * 
 * Polls the status of a background fusion job.
 * Returns the result if completed, or the current state (queued/active/failed).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  if (!jobId) {
    return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
  }

  try {
    const job = await fusionQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ 
        success: false, 
        error: 'Job not found. It may have expired or never existed.' 
      }, { status: 404 });
    }

    const state = await job.getState();
    const progress = job.progress;
    const reason = job.failedReason;

    // Handle different states
    if (state === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        data: job.returnvalue, // This is what the worker returned
      });
    }

    if (state === 'failed') {
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: reason || 'AI generation failed during background processing.'
      });
    }

    // Still in progress or queued
    return NextResponse.json({
      success: true,
      status: state, // 'active', 'waiting', 'delayed', etc.
      progress: progress,
      message: state === 'active' ? 'AI is currently fusing your movies...' : 'Your request is in the queue.'
    });

  } catch (error) {
    console.error(`[Job Status API] Error fetching job ${jobId}:`, error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
