// Import CertificationBot class
const CertificationBot = require('./bot-legacy-full');

// Create and start the bot
const startBot = async () => {
  console.log('🔧 DEBUG: Starting bot...');
  const bot = new CertificationBot();
  console.log('🔧 DEBUG: Bot created');
  return bot;
};

// Handle graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  try {
    const bot = global.botInstance;
    if (bot) {
      console.log('Stopping bot...');
      await bot.stop();

      console.log('Stopping notification service...');
      if (bot.notificationService) {
        bot.notificationService.stopNotificationPolling();
      }

      console.log('Closing database connection...');
      if (bot.mongoClient) {
        await bot.mongoClient.close();
      }

      console.log('Closing health server...');
      if (bot.healthServer) {
        bot.healthServer.close();
      }
    }

    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle Windows-specific signals
if (process.platform === 'win32') {
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
}

// Start the bot
startBot().then(bot => {
  global.botInstance = bot;
  console.log('🚀 Bot started successfully');
}).catch(error => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});

// Export for potential use as module
module.exports = { startBot };
