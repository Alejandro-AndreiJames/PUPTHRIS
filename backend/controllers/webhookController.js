const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { sequelize } = require("../config/db.config");
const queueService = require("../services/queueService");
require("dotenv").config();

class WebhookController {
  /**
   * Initializes the webhook controller with environment configurations.
   * @throws {Warning} When WEBHOOK_SECRET is not set
   */
  constructor() {
    this.flssWebhookUrl = process.env.FLSS_WEBHOOK_URL || "http://localhost:8000/api/webhooks/faculty";
    this.webhookSecret = process.env.WEBHOOK_SECRET;
    this.maxPayloadSize = 1024 * 1024;
    console.log("🪝  Webhooks initialized:", this.flssWebhookUrl);
    if (!this.webhookSecret) {
      console.warn("[WebhookController] Warning: WEBHOOK_SECRET is not set!");
    }
  }

  /**
   * Sends faculty update notifications to FLSS system.
   * @param {number} userId - The ID of the user being updated
   * @param {Object} updatedData - The updated faculty data
   * @returns {Promise<boolean>} Success status
   */
  async sendFacultyUpdateWebhook(userId, updatedData) {
    try {
      if (!this.webhookSecret) {
        console.error(
          "[WebhookController] Cannot send webhook: Webhook secret is not set"
        );
        return false;
      }

      console.log("[WebhookController] Queueing webhook for user:", userId);

      const user = await User.findByPk(userId);
      if (!user) {
        console.error(
          "[WebhookController] User not found for webhook:",
          userId
        );
        return false;
      }

      const facultyData = {
        hris_user_id: user.UserID,
        faculty_code: user.Fcode,
        first_name: user.FirstName,
        middle_name: user.MiddleName,
        last_name: user.Surname,
        name_extension: user.NameExtension,
        email: user.Email,
        status: user.isActive ? "Active" : "Inactive",
        faculty_type: this.#mapFacultyType(user.EmploymentType),
      };

      console.log(
        "[WebhookController] Sending faculty data:",
        JSON.stringify(facultyData, null, 2)
      );

      // Queue the webhook job
      await queueService.dispatch("faculty.webhook", {
        event: "faculty.updated",
        facultyData,
      });

      return true;
    } catch (error) {
      console.error("[WebhookController] Error queueing webhook:", error);
      return false;
    }
  }

  /**
   * Handles incoming webhooks from FLSS system.
   * @param {Express.Request} req - The incoming request object
   * @param {Express.Response} res - The response object
   * @returns {Promise<void>}
   */
  async handleFacultyWebhook(req, res) {
    try {
      const payloadSize = Buffer.byteLength(JSON.stringify(req.body));
      if (payloadSize > this.maxPayloadSize) {
        console.error("[WebhookController] Payload too large:", payloadSize);
        return res.status(413).json({ error: "Payload too large" });
      }

      const contentType = req.headers["content-type"];
      if (!contentType || !contentType.includes("application/json")) {
        console.error("[WebhookController] Invalid content type:", contentType);
        return res.status(415).json({ error: "Unsupported content type" });
      }

      console.log("[WebhookController] Received webhook from FLSS");
      console.log("[WebhookController] Request URL:", req.originalUrl);
      console.log("[WebhookController] Request method:", req.method);
      console.log(
        "[WebhookController] Headers:",
        JSON.stringify(req.headers, null, 2)
      );

      const rawBody = JSON.stringify(req.body);
      console.log("[WebhookController] Raw body:", rawBody);

      const signature = req.headers["x-hris-secret"];
      if (!signature) {
        console.error("[WebhookController] No signature provided in headers");
        return res.status(401).json({ error: "No signature provided" });
      }

      if (!this.verifySignature(rawBody, signature)) {
        console.error("[WebhookController] Invalid signature received");
        console.log("[WebhookController] Received signature:", signature);
        console.log(
          "[WebhookController] Raw body used for verification:",
          rawBody
        );
        const expectedSignature = this.generateSignature(rawBody);
        console.log(
          "[WebhookController] Expected signature:",
          expectedSignature
        );
        return res.status(401).json({ error: "Invalid signature" });
      }

      console.log("[WebhookController] Signature verified successfully");

      const payload = req.body;
      const { event, faculty_data, webhook_id } = payload;

      if (!event || !faculty_data) {
        console.error(
          "[WebhookController] Missing event or faculty_data in payload"
        );
        return res.status(400).json({ error: "Invalid payload structure" });
      }

      // Check for duplicate webhook
      if (webhook_id) {
        const processedKey = `processed_webhook:${webhook_id}`;
        const processed = await this.#checkProcessedWebhook(processedKey);
        if (processed) {
          console.log(
            "[WebhookController] Duplicate webhook received:",
            webhook_id
          );
          return res.status(409).json({ status: "already processed" });
        }
      }

      console.log("[WebhookController] Processing event:", event);
      console.log(
        "[WebhookController] Faculty data:",
        JSON.stringify(faculty_data, null, 2)
      );

      switch (event) {
        case "faculty.created":
        case "faculty.updated":
          await this.handleFacultyUpdate(faculty_data);
          break;
        default:
          console.warn("[WebhookController] Unknown webhook event:", event);
          return res.status(400).json({
            error: "Unknown event type",
            allowedEvents: ["faculty.created", "faculty.updated"],
          });
      }

      // Mark webhook as processed
      if (webhook_id) {
        await this.#markWebhookProcessed(`processed_webhook:${webhook_id}`);
      }

      console.log("[WebhookController] Webhook processed successfully");
      res.json({ status: "success" });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      console.error("[WebhookController] Error handling webhook:", {
        error: error.message,
        stack: error.stack,
        code: statusCode,
      });
      res.status(statusCode).json({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Processes faculty data updates received from FLSS.
   * Creates new faculty users or updates existing ones.
   * @param {Object} facultyData - Faculty information from FLSS
   * @returns {Promise<void>}
   * @throws {Error} When database operations fail
   */
  async handleFacultyUpdate(facultyData) {
    try {
      this.#validateRequiredFields(facultyData);

      console.log(
        "[WebhookController] Looking for user with Fcode:",
        facultyData.faculty_code
      );

      const user = await User.findOne({
        where: { Fcode: facultyData.faculty_code },
      });

      if (!user) {
        await this.#createFacultyUser(facultyData);
      } else {
        await this.#updateFacultyUser(user, facultyData);
      }
    } catch (error) {
      console.error("[WebhookController] Error handling faculty data:", error);
      throw error;
    }
  }

  /**
   * Sends account credentials email to newly created faculty
   * @private
   * @param {string} toEmail - Faculty email address
   * @param {string} password - Generated password
   * @param {string} firstName - Faculty first name
   * @param {string} lastName - Faculty last name
   * @returns {Promise<void>}
   */
  async #sendAccountEmail(toEmail, password, firstName, lastName) {
    try {
      let transporter;

      if (
        ["gmail", "outlook", "yahoo", "iskolarngbayan.pup.edu.ph"].includes(
          process.env.EMAIL_SERVICE
        )
      ) {
        transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE,
          auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
      } else {
        transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: false,
          auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
      }

      const siteLink = process.env.SITE_LINK || "https://pup-hris.site";

      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: toEmail,
        subject: "Your HRIS Account Details",
        text: `Hello ${firstName} ${lastName},\n\nYour HRIS account has been created successfully!\n\nHere are your account details:\n\nEmail: ${toEmail}\nPassword: ${password}\n\nYou can log in using the following link:\n${siteLink}\n\nFor security purposes, we recommend to change your password after your first login.\n\nBest regards, \nPUP Taguig Human Resources System`,
      };

      await transporter.sendMail(mailOptions);
      console.log(
        "[WebhookController] Account details email sent successfully to:",
        toEmail
      );
    } catch (error) {
      console.error("[WebhookController] Error sending account email:", error);
    }
  }

  /**
   * Generates a secure random password
   * @private
   * @returns {string} A secure random password
   */
  #generateSecurePassword() {
    const length = 12;
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnpqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "@#$%^&*";
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = "";

    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));

    for (let i = password.length; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Creates a new faculty user with atomic transaction
   * @private
   * @param {Object} facultyData - Faculty data from FLSS
   * @returns {Promise<Object>} Created user object
   */
  async #createFacultyUser(facultyData) {
    console.log(
      "[WebhookController] Creating new user:",
      facultyData.faculty_code
    );

    const userData = this.#processFacultyData(facultyData);
    const defaultPassword = this.#generateSecurePassword();
    console.log("[WebhookController] Generated secure password for new user");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    let transaction;
    try {
      transaction = await sequelize.transaction();

      // Create user
      const newUser = await User.create(
        {
          ...userData,
          PasswordHash: passwordHash,
          Salt: salt,
        },
        { transaction }
      );

      // Assign faculty role
      await sequelize.query(
        "INSERT INTO user_roles (UserID, RoleID) VALUES (?, ?)",
        {
          replacements: [newUser.UserID, 2],
          type: sequelize.QueryTypes.INSERT,
          transaction,
        }
      );

      // Send account credentials via email
      await this.#sendAccountEmail(
        facultyData.email,
        defaultPassword,
        facultyData.first_name,
        facultyData.last_name
      );

      // Commit transaction
      await transaction.commit();

      console.log(
        "[WebhookController] New user created successfully:",
        newUser.toJSON()
      );

      await this.sendFacultyUpdateWebhook(newUser.UserID, {
        ...facultyData,
        hris_user_id: newUser.UserID,
      });

      return newUser;
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("[WebhookController] Error creating faculty:", error);
      throw error;
    }
  }

  /**
   * Updates an existing faculty user with atomic transaction
   * @private
   * @param {Object} user - Existing user object
   * @param {Object} facultyData - Updated faculty data
   * @returns {Promise<void>}
   */
  async #updateFacultyUser(user, facultyData) {
    let transaction;
    try {
      transaction = await sequelize.transaction();

      console.log(
        "[WebhookController] Checking for changes in user:",
        user.toJSON()
      );

      const updates = {};
      for (const [flssField, config] of Object.entries(this.#fieldMappings)) {
        const flssValue = facultyData[flssField];
        if (flssValue === undefined) continue;

        try {
          let newValue;
          if (config.transform) {
            Object.assign(updates, config.transform(flssValue));
          } else {
            newValue = config.validate ? config.validate(flssValue) : flssValue;
            const currentValue = user[config.field];

            if (
              newValue !== currentValue &&
              (newValue !== null || currentValue !== null)
            ) {
              updates[config.field] = newValue;
            }
          }
        } catch (error) {
          console.warn(
            `[WebhookController] Skipping invalid field ${flssField}:`,
            error.message
          );
        }
      }

      if (Object.keys(updates).length > 0) {
        console.log("[WebhookController] Updating changed fields:", updates);
        await User.update(updates, {
          where: { Fcode: facultyData.faculty_code },
          transaction,
        });
        console.log(
          "[WebhookController] User updated successfully with changes:",
          updates
        );
      } else {
        console.log(
          "[WebhookController] No valid changes detected, skipping update"
        );
      }

      await transaction.commit();
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("[WebhookController] Error updating faculty:", error);
      throw error;
    }
  }

  /**
   * Field mappings with validation and transformation rules for faculty data
   * @private
   */
  #fieldMappings = {
    email: {
      field: "Email",
      validate: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error(`Invalid email format: ${value}`);
        }
        return value;
      },
    },
    status: {
      transform: (value) => {
        if (!["Active", "Inactive"].includes(value)) {
          throw new Error(`Invalid status value: ${value}`);
        }
        return { isActive: value === "Active" };
      },
    },
    faculty_type: {
      transform: (value) => {
        const normalized = value.replace(/[- ]/g, "").toLowerCase();
        const validTypes = ["fulltime", "parttime", "temporary", "designee"];
        if (!validTypes.includes(normalized)) {
          throw new Error(`Invalid faculty type: ${value}`);
        }
        return { EmploymentType: normalized };
      },
    },
    last_name: {
      field: "Surname",
      validate: (value) => {
        if (typeof value !== "string" || value.trim().length === 0) {
          throw new Error("Last name cannot be empty");
        }
        return value.trim();
      },
    },
    first_name: {
      field: "FirstName",
      validate: (value) => {
        if (typeof value !== "string" || value.trim().length === 0) {
          throw new Error("First name cannot be empty");
        }
        return value.trim();
      },
    },
    middle_name: {
      field: "MiddleName",
      validate: (value) => value?.trim() || null,
    },
    name_extension: {
      field: "NameExtension",
      validate: (value) => value?.trim() || null,
    },
  };

  /**
   * Validates required fields in faculty data
   * @private
   * @param {Object} facultyData - Faculty data to validate
   * @throws {Error} If required fields are missing
   */
  #validateRequiredFields(facultyData) {
    const requiredFields = [
      "faculty_code",
      "email",
      "status",
      "faculty_type",
      "first_name",
      "last_name",
    ];
    const missingFields = requiredFields.filter((field) => !facultyData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }
  }

  /**
   * Processes and validates faculty data using field mappings
   * @private
   * @param {Object} facultyData - Raw faculty data
   * @returns {Object} Processed user data
   */
  #processFacultyData(facultyData) {
    const userData = {
      Fcode: facultyData.faculty_code,
      CollegeCampusID: 2,
    };

    for (const [flssField, config] of Object.entries(this.#fieldMappings)) {
      const value = facultyData[flssField];

      if (config.transform) {
        Object.assign(userData, config.transform(value));
      } else {
        userData[config.field] = config.validate
          ? config.validate(value)
          : value;
      }
    }

    return userData;
  }

  /**
   * Map faculty types from HRIS to FLSS format
   * @param {string} hrisType - HRIS faculty type
   * @returns {string} FLSS faculty type
   */
  #mapFacultyType(hrisType) {
    const typeMapping = {
      fulltime: "Full-Time",
      parttime: "Part-Time",
      designee: "Designee",
      temporary: "Temporary",
    };
    return typeMapping[hrisType] || hrisType;
  }

  /**
   * Generates HMAC signature for webhook payload validation.
   * @param {string|Object} payload - Data to sign
   * @returns {string|null} Hexadecimal signature or null if secret is not set
   */
  generateSignature(payload) {
    if (!this.webhookSecret) {
      console.error("[WebhookController] Webhook secret is not set");
      return null;
    }

    const hmac = crypto.createHmac("sha256", this.webhookSecret);
    console.log(
      "[WebhookController] Generating signature for payload:",
      payload
    );

    const data =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    hmac.update(data);

    const signature = hmac.digest("hex");
    console.log("[WebhookController] Generated signature:", signature);
    return signature;
  }

  /**
   * Verifies incoming webhook signature.
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Received signature to verify
   * @returns {boolean} True if signature is valid
   */
  verifySignature(payload, signature) {
    if (!signature || !this.webhookSecret) {
      console.error("[WebhookController] Missing signature or webhook secret");
      return false;
    }

    const expectedSignature = this.generateSignature(payload);
    if (!expectedSignature) {
      return false;
    }

    console.log("[WebhookController] Signature comparison:", {
      received: signature,
      expected: expectedSignature,
      secret: this.webhookSecret,
    });

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Check if a webhook has been processed
   */
  async #checkProcessedWebhook(webhookId) {
    return await queueService.checkWebhookProcessed(webhookId);
  }

  /**
   * Mark a webhook as processed
   */
  async #markWebhookProcessed(webhookId) {
    await queueService.markWebhookProcessed(webhookId);
  }
}

module.exports = new WebhookController();
