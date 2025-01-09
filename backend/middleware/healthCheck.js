const os = require("os");
const { sequelize } = require("../config/db.config");

const MEMORY_THRESHOLD = 95;
const CPU_LOAD_THRESHOLD = 95;
const DB_TIMEOUT = 5000;

/**
 * Checks the health status of the HRIS database connection.
 * @returns {Promise<Object>} Object containing:
 * - status: 'healthy' | 'degraded' | 'unhealthy'
 * - latency: Database response time in milliseconds
 * - connectionPool: Current state of database connection pool
 * - error?: Error message if status is not healthy
 * - errorType?: Type of error encountered
 */
const checkHrisDbHealth = async () => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Database health check timeout")),
        DB_TIMEOUT
      )
    );

    const startTime = process.hrtime();
    await Promise.race([sequelize.authenticate(), timeoutPromise]);
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const latency = seconds * 1000 + nanoseconds / 1000000;

    return {
      status: "healthy",
      latency,
      connectionPool: {
        total: sequelize.connectionManager.pool.size,
        idle: sequelize.connectionManager.pool.idle,
        active: sequelize.connectionManager.pool.length,
      },
    };
  } catch (error) {
    const isTimeout = error.message === "Database health check timeout";

    return {
      status: isTimeout ? "degraded" : "unhealthy",
      latency: 0,
      error: error.message,
      errorType: error.name,
      connectionPool: {
        total: sequelize.connectionManager.pool?.size || 0,
        idle: sequelize.connectionManager.pool?.idle || 0,
        active: sequelize.connectionManager.pool?.length || 0,
      },
    };
  }
};

/**
 * Gathers system metrics including memory, CPU, and process information.
 * @returns {Object} Object containing:
 * - memory: System memory statistics and status
 * - cpu: CPU load, cores, and status information
 * - process: Node.js process metrics and version
 */
const getSystemMetrics = () => {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;
  const cpuLoad = (os.loadavg()[0] * 100) / os.cpus().length;

  return {
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercentage: memoryUsagePercent.toFixed(2),
      status: memoryUsagePercent > MEMORY_THRESHOLD ? "warning" : "healthy",
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0].model,
      loadAverage: os.loadavg(),
      loadPercentage: cpuLoad.toFixed(2),
      status: cpuLoad > CPU_LOAD_THRESHOLD ? "warning" : "healthy",
      uptime: os.uptime(),
    },
    process: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
    },
  };
};

/**
 * Express middleware that performs comprehensive health checks.
 * Monitors database connectivity, system resources, and API status.
 * Returns appropriate HTTP status codes based on system health:
 * - 200: All systems healthy
 * - 400: Warning state (resource thresholds exceeded)
 * - 429: Degraded state (database performance issues)
 * - 503: Critical state (database unavailable)
 *
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 */
const healthCheckHandler = async (_req, res) => {
  const startTime = process.hrtime();

  try {
    const dbStatus = await checkHrisDbHealth();
    const systemMetrics = getSystemMetrics();
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1000000;

    // Determine overall system health
    const isSystemHealthy =
      dbStatus.status === "healthy" &&
      systemMetrics.memory.status === "healthy" &&
      systemMetrics.cpu.status === "healthy";

    // Determine appropriate status code
    let statusCode = 200;
    let healthStatus = "healthy";

    if (!isSystemHealthy) {
      if (dbStatus.status === "unhealthy") {
        statusCode = 503; // Service Unavailable
        healthStatus = "critical";
      } else if (dbStatus.status === "degraded") {
        // Introduce 'degraded' state
        statusCode = 429;
        healthStatus = "degraded";
      } else {
        statusCode = 400;
        healthStatus = "warning";
      }
    }

    res.status(statusCode).json({
      status: healthStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: {
          ...dbStatus,
          dialect: sequelize.getDialect(),
        },
        api: {
          status: "healthy",
          responseTime: `${responseTime.toFixed(2)}ms`,
        },
      },
      system: systemMetrics,
      environment: process.env.NODE_ENV || "development",
      thresholds: {
        memory: MEMORY_THRESHOLD,
        cpu: CPU_LOAD_THRESHOLD,
        dbTimeout: DB_TIMEOUT,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "critical",
      timestamp: new Date().toISOString(),
      error: {
        message: "Health check failed",
        type: error.name,
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    });
  }
};

module.exports = {
  healthCheckHandler,
  checkHrisDbHealth,
  getSystemMetrics,
};
