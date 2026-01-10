/**
 * Homework Rescue - Lesson Generation Queue
 *
 * Handles the complete lesson generation pipeline:
 * 1. Script generation (Claude)
 * 2. QA verification
 * 3. Audio generation (ElevenLabs)
 * 4. Visual generation (Canvas)
 * 5. Video composition (FFmpeg)
 * 6. PDF generation
 * 7. Upload & delivery
 *
 * Uses a simple in-memory queue for MVP (can upgrade to BullMQ + Redis for production)
 */

import { EventEmitter } from 'events';
import {
  HomeworkIntake,
  HomeworkOrder,
  OrderStatus,
  LessonScript,
  QAResult
} from '../lib/thoughtEngine/homework/types';
import { generateHomeworkScript } from '../lib/thoughtEngine/homework/generateHomeworkScript';
import { verifyAndRegenerateIfNeeded } from '../lib/thoughtEngine/homework/homeworkQA';
import {
  composeLessonVideo,
  selectVoiceForIntake,
  uploadVideo
} from '../lib/thoughtEngine/homework/lessonVideoComposer';
import {
  generateHomeworkPDFs,
  uploadPDFs
} from '../lib/thoughtEngine/homework/homeworkPDFGenerator';

// Queue configuration
const MAX_CONCURRENT_JOBS = 3;
const JOB_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// Simple in-memory queue
interface QueueJob {
  id: string;
  orderId: string;
  intake: HomeworkIntake;
  email: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: {
    videoUrl: string;
    practiceSheetUrl: string;
    answerKeyUrl: string;
    parentSummaryUrl: string;
  };
}

class LessonQueue extends EventEmitter {
  private jobs: Map<string, QueueJob> = new Map();
  private pendingJobs: string[] = [];
  private processingCount = 0;

  /**
   * Add a new job to the queue
   */
  async addJob(orderId: string, intake: HomeworkIntake, email: string): Promise<string> {
    const jobId = `job_${orderId}_${Date.now()}`;

    const job: QueueJob = {
      id: jobId,
      orderId,
      intake,
      email,
      status: 'pending',
      progress: 0,
      currentStep: 'Queued'
    };

    this.jobs.set(jobId, job);
    this.pendingJobs.push(jobId);

    console.log(`[Queue] Job ${jobId} added for order ${orderId}`);

    // Emit event for real-time updates
    this.emit('job:added', { jobId, orderId });

    // Try to process immediately if capacity available
    this.processNext();

    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): QueueJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get job by order ID
   */
  getJobByOrderId(orderId: string): QueueJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.orderId === orderId) {
        return job;
      }
    }
    return undefined;
  }

  /**
   * Process the next pending job
   */
  private async processNext(): Promise<void> {
    if (this.processingCount >= MAX_CONCURRENT_JOBS) {
      return;
    }

    const jobId = this.pendingJobs.shift();
    if (!jobId) {
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    this.processingCount++;
    job.status = 'processing';
    job.startedAt = new Date();

    console.log(`[Queue] Processing job ${jobId}`);

    try {
      await this.processJob(job);
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.currentStep = 'Completed';

      this.emit('job:completed', { jobId, orderId: job.orderId, result: job.result });

    } catch (error: any) {
      console.error(`[Queue] Job ${jobId} failed:`, error);
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      this.emit('job:failed', { jobId, orderId: job.orderId, error: error.message });
    }

    this.processingCount--;

    // Process next job
    this.processNext();
  }

  /**
   * Process a single job through the full pipeline
   */
  private async processJob(job: QueueJob): Promise<void> {
    const { intake, orderId } = job;

    // Step 1: Generate Script (0-25%)
    this.updateProgress(job, 5, 'Generating personalized lesson script...');
    const script = await generateHomeworkScript(intake);
    this.updateProgress(job, 15, 'Script generated, verifying content...');

    // Step 2: QA Verification (25-35%)
    this.updateProgress(job, 25, 'Verifying lesson accuracy...');
    const { script: verifiedScript, qaResult, attempts } = await verifyAndRegenerateIfNeeded(script, intake);
    this.updateProgress(job, 35, `QA complete (${attempts} attempt${attempts > 1 ? 's' : ''})`);

    if (!qaResult.passed && qaResult.errors.length > 0) {
      console.warn(`[Queue] QA warnings for ${orderId}:`, qaResult.warnings);
    }

    // Step 3: Generate Audio (35-55%)
    this.updateProgress(job, 40, 'Generating voiceover audio...');
    const voiceType = selectVoiceForIntake(intake);

    // Step 4: Generate Visuals (55-70%)
    this.updateProgress(job, 55, 'Creating lesson visuals...');

    // Step 5: Compose Video (70-85%)
    this.updateProgress(job, 70, 'Composing video...');
    const { videoPath, duration } = await composeLessonVideo(
      verifiedScript,
      intake,
      orderId,
      voiceType
    );
    this.updateProgress(job, 85, `Video complete (${Math.round(duration / 60)} minutes)`);

    // Step 6: Generate PDFs (85-92%)
    this.updateProgress(job, 87, 'Generating practice materials...');
    const pdfPaths = await generateHomeworkPDFs(verifiedScript, intake, orderId);
    this.updateProgress(job, 92, 'Practice materials ready');

    // Step 7: Upload & Deliver (92-100%)
    this.updateProgress(job, 94, 'Uploading lesson...');
    const videoUrl = await uploadVideo(videoPath, orderId);
    const pdfUrls = await uploadPDFs(pdfPaths, orderId);
    this.updateProgress(job, 98, 'Preparing delivery...');

    // Store result
    job.result = {
      videoUrl,
      practiceSheetUrl: pdfUrls.practiceSheetUrl,
      answerKeyUrl: pdfUrls.answerKeyUrl,
      parentSummaryUrl: pdfUrls.parentSummaryUrl
    };

    this.updateProgress(job, 100, 'Complete!');

    console.log(`[Queue] Job ${job.id} completed successfully`);
  }

  /**
   * Update job progress
   */
  private updateProgress(job: QueueJob, progress: number, step: string): void {
    job.progress = progress;
    job.currentStep = step;

    this.emit('job:progress', {
      jobId: job.id,
      orderId: job.orderId,
      progress,
      step
    });

    console.log(`[Queue] ${job.orderId}: ${progress}% - ${step}`);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    let pending = 0, processing = 0, completed = 0, failed = 0;

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'pending': pending++; break;
        case 'processing': processing++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
      }
    }

    return { pending, processing, completed, failed };
  }

  /**
   * Clean up old completed/failed jobs
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt.getTime() < cutoff) {
        this.jobs.delete(jobId);
      }
    }
  }
}

// Singleton instance
export const lessonQueue = new LessonQueue();

/**
 * Order management functions
 */

// In-memory order storage (replace with database in production)
const orders: Map<string, HomeworkOrder> = new Map();

export function createOrder(
  intake: HomeworkIntake,
  email: string,
  stripePaymentId?: string
): HomeworkOrder {
  const order: HomeworkOrder = {
    id: intake.orderId,
    intake,
    status: 'intake_complete',
    createdAt: new Date(),
    email,
    stripePaymentId,
    isRemake: false
  };

  orders.set(order.id, order);
  return order;
}

export function getOrder(orderId: string): HomeworkOrder | undefined {
  return orders.get(orderId);
}

export function updateOrderStatus(orderId: string, status: OrderStatus): void {
  const order = orders.get(orderId);
  if (order) {
    order.status = status;
  }
}

export function updateOrderWithResults(
  orderId: string,
  results: {
    videoUrl: string;
    practiceSheetUrl: string;
    answerKeyUrl: string;
    parentSummaryUrl: string;
  }
): void {
  const order = orders.get(orderId);
  if (order) {
    order.videoUrl = results.videoUrl;
    order.practiceSheetUrl = results.practiceSheetUrl;
    order.answerKeyUrl = results.answerKeyUrl;
    order.parentSummaryUrl = results.parentSummaryUrl;
    order.completedAt = new Date();
    order.status = 'completed';
    order.videoGenerated = true;
    order.pdfsGenerated = true;
  }
}

/**
 * Queue event listeners for order updates
 */
lessonQueue.on('job:progress', ({ orderId, progress, step }) => {
  const order = orders.get(orderId);
  if (order) {
    // Map progress to status
    if (progress < 25) {
      order.status = 'generating_script';
    } else if (progress < 35) {
      order.status = 'verifying_qa';
    } else if (progress < 55) {
      order.status = 'generating_audio';
      order.scriptGenerated = true;
    } else if (progress < 70) {
      order.status = 'generating_visuals';
      order.audioGenerated = true;
    } else if (progress < 85) {
      order.status = 'rendering_video';
      order.visualsGenerated = true;
    } else if (progress < 92) {
      order.status = 'generating_pdfs';
      order.videoGenerated = true;
    } else {
      order.status = 'uploading';
      order.pdfsGenerated = true;
    }
  }
});

lessonQueue.on('job:completed', ({ orderId, result }) => {
  if (result) {
    updateOrderWithResults(orderId, result);
  }
});

lessonQueue.on('job:failed', ({ orderId, error }) => {
  const order = orders.get(orderId);
  if (order) {
    order.status = 'failed';
  }
});

/**
 * Start processing a new order
 */
export async function startLessonGeneration(
  orderId: string,
  intake: HomeworkIntake,
  email: string
): Promise<string> {
  // Create/update order
  const existingOrder = orders.get(orderId);
  if (existingOrder) {
    existingOrder.status = 'pending';
    existingOrder.startedAt = new Date();
  } else {
    createOrder(intake, email);
  }

  // Add to queue
  const jobId = await lessonQueue.addJob(orderId, intake, email);

  return jobId;
}

/**
 * Create a remake order
 */
export async function createRemakeOrder(
  originalOrderId: string,
  updatedIntake: HomeworkIntake,
  remakeReason: string
): Promise<string> {
  const originalOrder = orders.get(originalOrderId);
  if (!originalOrder) {
    throw new Error('Original order not found');
  }

  const remakeOrderId = `${originalOrderId}_remake_${Date.now()}`;
  updatedIntake.orderId = remakeOrderId;

  const remakeOrder: HomeworkOrder = {
    id: remakeOrderId,
    intake: updatedIntake,
    status: 'pending',
    createdAt: new Date(),
    email: originalOrder.email,
    isRemake: true,
    originalOrderId,
    remakeReason
  };

  orders.set(remakeOrderId, remakeOrder);

  // Add to queue
  const jobId = await lessonQueue.addJob(remakeOrderId, updatedIntake, originalOrder.email);

  return remakeOrderId;
}
