# Test Scripts

This directory contains all test scripts, debugging tools, and example implementations for the Telegram Bot, organized into the following subdirectories:

## Directory Structure

### `/unit/` - Unit Tests
- `test-answer-validation.js` - Tests answer validation logic
- `test-multiple-choice-detection.js` - Tests multiple choice question detection
- `test-multiple-choice-scoring.js` - Tests scoring for multiple choice questions
- `test-multi-answer.js` - Tests multi-answer question handling
- `test-html-formatting.js` - Tests HTML message formatting

### `/integration/` - Integration Tests
- `test-bot-connection.js` - Tests bot connection to Telegram API
- `test-db-connection.js` - Tests database connectivity
- `test-complete-flow.js` - End-to-end quiz flow testing
- `test-e2e-complete.js` - Complete end-to-end testing
- `test-e2e-quiz.js` - Quiz-specific end-to-end testing
- `test-bot-startup.js` - Tests bot initialization
- `test-bot.js` - General bot functionality tests
- `test-help-command.js` - Tests help command functionality
- `test-menu-system.js` - Tests interactive menu system
- `test-answer-mongodb.js` - Tests answer storage in MongoDB
- `test-db-only.js` - Database-only tests without bot
- `test-notification-flow.js` - Tests notification system flow
- `test-notification-send.js` - Tests notification sending
- `test-fixed-notification.js` - Tests fixed notification issues
- `test-fixed-notifications.js` - Tests multiple notification fixes
- `test-polling.js` - Tests polling mechanism
- `test-sse-player-status.js` - Tests server-sent events for player status
- `test-curl-workaround.js` - Tests curl workaround solutions
- `test-modular.js` - Modular bot testing

### `/quizblitz/` - QuizBlitz Tests
- `test-quizblitz-flow.js` - Tests QuizBlitz multiplayer functionality
- `test-quizblitz-scores.js` - Tests QuizBlitz scoring system
- `test-join-quiz.js` - Tests quiz joining functionality
- `test-join-simple.js` - Simple quiz joining test
- `test-offline-quizblitz.js` - Offline QuizBlitz testing
- `test-quiz-interaction.js` - Manual quiz interaction testing
- `test-quiz-notifications.js` - Manual quiz notification testing

### `/debug/` - Debug Tools
- `debug-bot.js` - Bot debugging utilities
- `debug-answer-processing.js` - Answer processing debugging
- `debug-player-structure.js` - Player data structure debugging
- `check-quiz-events.js` - Checks quiz event storage
- `check-real-data.js` - Validates real data integrity
- `verify-fix.js` - Verifies bug fixes

### `/examples/` - Example Implementations
- `change-streams-example.js` - MongoDB change streams example
- `polling-vs-changestreams.js` - Comparison of polling vs change streams
- `quizblitz-bot-polling.js` - QuizBlitz bot with polling implementation
- `quizblitz-bot-sync.js` - Synchronous QuizBlitz bot implementation
- `manual-question-test.js` - Manual question testing tool
- `simulate-quizblitz-complete.js` - Simulates complete QuizBlitz session

## Running Tests

To run tests from the telegram-bot root directory:

```bash
# Unit tests
node src/test/unit/test-answer-validation.js
node src/test/unit/test-multiple-choice-detection.js

# Integration tests  
node src/test/integration/test-complete-flow.js
node src/test/integration/test-bot-connection.js

# QuizBlitz tests
node src/test/quizblitz/test-quizblitz-flow.js
node src/test/quizblitz/test-join-quiz.js

# Debug tools
node src/test/debug/debug-bot.js
node src/test/debug/check-quiz-events.js

# Examples
node src/test/examples/change-streams-example.js
```

## Notes

- Most tests require proper environment variables (BOT_TOKEN, MONGODB_URI)
- Some tests require an active MongoDB connection
- QuizBlitz tests may require active quiz sessions
- Debug tools provide real-time information for troubleshooting
