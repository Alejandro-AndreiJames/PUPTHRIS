const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db.config");
const { Job, FailedJob, ProcessedWebhook } = require("../models/queueJobs");
const crypto = require("crypto");
const axios = require("axios");

class QueueService {
  constructor() {
    this.isProcessing = false;
    this.maxAttempts = 100;
    this.jobTimeout = 5 * 60;
    this.webhookRetentionDays = 30;
    this.maxRetryDelay = 24 * 60 * 60;
    this.baseRetryDelay = 60;
    this.maxRetryAge = 30 * 24 * 60 * 60;
    this.failedJobRetentionDays = 30;

    setInterval(() => this.cleanupExpiredWebhooks(), 24 * 60 * 60 * 1000);
    setInterval(() => this.cleanupAgedJobs(), 6 * 60 * 60 * 1000);
    setInterval(() => this.cleanupFailedJobs(), 24 * 60 * 60 * 1000);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempts) {
    const delay = this.baseRetryDelay * Math.pow(2, attempts - 1);
    return Math.min(delay, this.maxRetryDelay);
  }

  /**
   * Add a job to the queue
   */
  async dispatch(jobType, payload, options = {}) {
    const now = Math.floor(Date.now() / 1000);

    const payloadSize = Buffer.byteLength(JSON.stringify(payload));
    const maxPayloadSize = 1024 * 1024;
    if (payloadSize > maxPayloadSize) {
      throw new Error(
        `Payload size ${payloadSize} exceeds maximum allowed size of ${maxPayloadSize} bytes`
      );
    }

    await Job.create({
      queue: jobType,
      payload: JSON.stringify({
        id: uuidv4(),
        type: jobType,
        data: payload,
        timestamp: new Date().toISOString(),
        ...options,
      }),
      attempts: 0,
      reserved_at: null,
      available_at: now,
      created_at: now,
      timeout_at: null,
    });
  }

  /**
   * Process jobs in the queue
   */
  async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const job = await this.getNextJob();
        if (!job) {
          break;
        }

        try {
          const timeoutAt = Math.floor(Date.now() / 1000) + this.jobTimeout;
          await job.update({ timeout_at: timeoutAt });

          await this.processJob(job);
          await job.destroy();
        } catch (error) {
          await this.handleFailedJob(job, error);
        }
      }

      await this.cleanupTimedOutJobs();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get the next available job with proper locking
   */
  async getNextJob() {
    const now = Math.floor(Date.now() / 1000);

    return await sequelize.transaction(async (transaction) => {
      const job = await Job.findOne({
        where: {
          reserved_at: null,
          available_at: {
            [Op.lte]: now,
          },
        },
        order: [["created_at", "ASC"]],
        lock: true,
        transaction,
      });

      if (job) {
        await job.update(
          {
            reserved_at: now,
          },
          { transaction }
        );
      }

      return job;
    });
  }

  /**
   * Process a specific job
   */
  async processJob(job) {
    const payload = JSON.parse(job.payload);
    const { type, data } = payload;

    switch (type) {
      case "faculty.webhook":
        await this.processFacultyWebhook(data);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
   * Process faculty webhook with idempotency
   */
  async processFacultyWebhook(data) {
    const { event, facultyData } = data;
    const webhookUrl = process.env.FLSS_WEBHOOK_URL;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("Webhook secret is not set");
    }

    const webhookId = uuidv4();
    const payload = {
      webhook_id: webhookId,
      event,
      faculty_data: facultyData,
      timestamp: new Date().toISOString(),
    };

    const jsonPayload = JSON.stringify(payload);
    const signature = this.generateSignature(jsonPayload, webhookSecret);

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-HRIS-Secret": signature,
        "X-Webhook-ID": webhookId,
      },
      timeout: 10000,
    });

    if (!response.data || response.status >= 400) {
      // Don't retry on certain status codes
      if (response.status === 409) {
        // Already processed
        await this.markWebhookProcessed(webhookId);
        return;
      }

      if ([400, 401, 403].includes(response.status)) {
        throw new Error(
          `Webhook request failed with status ${response.status} - will not retry`
        );
      }

      throw new Error(`Webhook request failed with status ${response.status}`);
    }

    // Mark webhook as successfully processed
    await this.markWebhookProcessed(webhookId);
  }

  /**
   * Handle a failed job
   */
  async handleFailedJob(job, error) {
    const payload = JSON.parse(job.payload);
    job.attempts += 1;

    // Check job age
    const jobAge = Math.floor(Date.now() / 1000) - job.created_at;
    if (jobAge >= this.maxRetryAge) {
      await this.moveToFailedJobs(
        job,
        new Error("Job exceeded maximum retry age of 30 days")
      );
      await job.destroy();
      return;
    }

    if (job.attempts >= this.maxAttempts) {
      await this.moveToFailedJobs(job, error);
      await job.destroy();
      return;
    }

    // Calculate next retry with exponential backoff
    const delay = this.calculateRetryDelay(job.attempts);
    job.available_at = Math.floor(Date.now() / 1000) + delay;
    job.reserved_at = null;
    job.timeout_at = null;
    await job.save();
  }

  /**
   * Move a job to the failed jobs table
   */
  async moveToFailedJobs(job, error) {
    try {
      await FailedJob.createWithUniqueUUID({
        uuid: uuidv4(),
        connection: "mysql",
        queue: job.queue,
        payload: job.payload,
        exception: error.stack || error.message,
        failed_at: new Date(),
      });
    } catch (err) {
      if (err.message === "A failed job with this UUID already exists") {
        // If UUID collision occurs, try again with a new UUID
        return this.moveToFailedJobs(job, error);
      }
      throw err;
    }
  }

  /**
   * Clean up timed out jobs
   */
  async cleanupTimedOutJobs() {
    const now = Math.floor(Date.now() / 1000);

    const timedOutJobs = await Job.findAll({
      where: {
        reserved_at: {
          [Op.ne]: null,
        },
        timeout_at: {
          [Op.lte]: now,
        },
      },
    });

    for (const job of timedOutJobs) {
      job.reserved_at = null;
      job.timeout_at = null;
      job.attempts += 1;

      if (job.attempts >= this.maxAttempts) {
        await this.moveToFailedJobs(job, new Error("Job timed out"));
        await job.destroy();
      } else {
        const delay = this.calculateRetryDelay(job.attempts);
        job.available_at = now + delay;
        await job.save();
      }
    }
  }

  /**
   * Clean up expired processed webhooks
   */
  async cleanupExpiredWebhooks() {
    const now = new Date();
    await ProcessedWebhook.destroy({
      where: {
        expires_at: {
          [Op.lt]: now,
        },
      },
    });
  }

  /**
   * Mark a webhook as processed
   */
  async markWebhookProcessed(webhookId) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.webhookRetentionDays);

    await ProcessedWebhook.createWithUniqueWebhookId({
      webhook_id: webhookId,
      processed_at: new Date(),
      expires_at: expiresAt,
    });
  }

  /**
   * Check if a webhook has been processed
   */
  async checkWebhookProcessed(webhookId) {
    const processed = await ProcessedWebhook.findOne({
      where: {
        webhook_id: webhookId,
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
    });

    return !!processed;
  }

  /**
   * Generate HMAC signature for payload
   */
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return hmac.digest("hex");
  }

  /**
   * Start the queue worker
   */
  async startWorker(interval = 1000) {
    setInterval(async () => {
      try {
        await this.processJobs();
      } catch (error) {
        console.error("Error processing queue:", error);
      }
    }, interval);
  }

  /**
   * Clean up aged jobs
   */
  async cleanupAgedJobs() {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - this.maxRetryAge;

    const agedJobs = await Job.findAll({
      where: {
        created_at: {
          [Op.lt]: cutoff,
        },
      },
    });

    for (const job of agedJobs) {
      await this.moveToFailedJobs(
        job,
        new Error("Job exceeded maximum retry age of 30 days")
      );
      await job.destroy();
    }
  }

  /**
   * Clean up old failed jobs
   */
  async cleanupFailedJobs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.failedJobRetentionDays);

    try {
      const deletedCount = await FailedJob.destroy({
        where: {
          failed_at: {
            [Op.lt]: cutoffDate,
          },
        },
      });
      console.log(
        `Cleaned up ${deletedCount} failed jobs older than ${this.failedJobRetentionDays} days`
      );
    } catch (error) {
      console.error("Error cleaning up failed jobs:", error);
    }
  }
}

module.exports = new QueueService();
