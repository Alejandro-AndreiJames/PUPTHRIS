const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db.config");

const Job = sequelize.define(
  "Job",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    queue: {
      type: DataTypes.STRING,
    },
    payload: {
      type: DataTypes.TEXT,
    },
    attempts: {
      type: DataTypes.TINYINT.UNSIGNED,
      defaultValue: 0,
    },
    reserved_at: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    available_at: {
      type: DataTypes.INTEGER,
    },
    created_at: {
      type: DataTypes.INTEGER,
    },
    timeout_at: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "jobs",
    timestamps: false,
    indexes: [
      {
        fields: ["queue", "reserved_at"],
      },
      {
        fields: ["available_at"],
      },
    ],
  }
);

const FailedJob = sequelize.define(
  "FailedJob",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
      },
    },
    connection: {
      type: DataTypes.TEXT,
    },
    queue: {
      type: DataTypes.TEXT,
    },
    payload: {
      type: DataTypes.TEXT,
    },
    exception: {
      type: DataTypes.TEXT,
    },
    failed_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    tableName: "failed_jobs",
    timestamps: false,
  }
);

FailedJob.createWithUniqueUUID = async function (jobData) {
  const existingJob = await this.findOne({
    where: { uuid: jobData.uuid },
  });

  if (existingJob) {
    throw new Error("A failed job with this UUID already exists");
  }

  return await this.create(jobData);
};

const ProcessedWebhook = sequelize.define(
  "ProcessedWebhook",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    webhook_id: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
      },
    },
    processed_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    expires_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "processed_webhooks",
    timestamps: false,
    indexes: [
      {
        fields: ["expires_at"],
      },
    ],
  }
);

ProcessedWebhook.createWithUniqueWebhookId = async function (webhookData) {
  const [webhook, created] = await this.findOrCreate({
    where: { webhook_id: webhookData.webhook_id },
    defaults: {
      processed_at: webhookData.processed_at,
      expires_at: webhookData.expires_at,
    },
  });

  return webhook;
};

module.exports = { Job, FailedJob, ProcessedWebhook };
