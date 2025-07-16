# Modular Telegram Bot Architecture

This directory contains the refactored modular version of the Telegram bot.

## Directory Structure

```
src/
├── bot.js                 # Main bot class and entry point
├── handlers/             # Message and callback handlers
│   ├── messageHandlers.js    # Text message handlers
│   └── callbackHandlers.js   # Button callback handlers
├── services/             # Business logic services
│   ├── databaseService.js    # Database operations
│   ├── quizService.js        # Quiz logic and operations
│   └── notificationService.js # QuizBlitz notifications
├── utils/               # Utility functions
│   └── answerUtils.js       # Answer validation utilities
└── models/              # Data models (future expansion)
```

## Key Components

### Services
- **DatabaseService**: Handles all MongoDB operations
- **QuizService**: Manages quiz logic, questions, and scoring
- **NotificationService**: Handles QuizBlitz real-time notifications

### Handlers
- **MessageHandlers**: Processes text messages and commands
- **CallbackHandlers**: Handles button clicks and interactions

### Utilities
- **AnswerUtils**: Functions for answer validation and formatting

## Running the Modular Bot

```bash
# Run the modular version
node bot-modular.js

# Or run the original version
node bot.js
```

## Benefits of Modular Architecture

1. **Separation of Concerns**: Each module has a single responsibility
2. **Maintainability**: Easier to find and fix bugs
3. **Testability**: Each module can be tested independently
4. **Scalability**: Easy to add new features without affecting existing code
5. **Reusability**: Components can be reused across different parts of the application

## Migration Notes

- All functionality from the original `bot.js` has been preserved
- The modular version maintains the same API and behavior
- Database operations are centralized in `DatabaseService`
- Quiz logic is isolated in `QuizService`
- Message handling is separated by type (text vs callbacks)

## Future Enhancements

- Add TypeScript support
- Implement unit tests for each module
- Add configuration management
- Implement caching service
- Add logging service
- Add metrics and monitoring