// src/server.ts
import app from './app';
import { config } from './config';
import { logger } from './utils/logger.util';
import { prisma } from './config/database';
import { redis } from './config/redis';

const PORT = config.port;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    // Close server
    server.close(async () => {
      logger.info('HTTP server closed');

      // Close database connection
      await prisma.$disconnect();
      logger.info('Database connection closed');

      // Close Redis connection
      redis.disconnect();
      logger.info('Redis connection closed');

      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Start server
const server = app.listen(PORT, () => {
  logger.info(`
    ╔═══════════════════════════════════════╗
    ║   Susu & Savings API Server Started  ║
    ╠═══════════════════════════════════════╣
    ║   Environment: ${config.env.padEnd(23)} ║
    ║   Port: ${PORT.toString().padEnd(30)} ║
    ║   API Version: ${config.apiVersion.padEnd(23)} ║
    ╚═══════════════════════════════════════╝
  `);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;