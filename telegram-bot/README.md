# AWS Certification Telegram Bot

A Telegram bot built with Grammy framework for AWS certification quiz practice.

## Features

- 🎓 **Certificate Selection**: Choose from available AWS certificates
- 🔑 **Access Code Validation**: Enter generated access codes to access quizzes
- 📝 **Interactive Quiz**: Multiple choice questions with A, B, C, D options
- ✅ **Instant Feedback**: Immediate results for correct answers
- ❌ **Detailed Explanations**: Comprehensive explanations for wrong answers
- 📊 **Results Summary**: Complete quiz statistics and performance tracking
- 💾 **Progress Tracking**: All quiz attempts saved to MongoDB

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Update `.env` file with your bot token:
   ```
   BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
   MONGODB_URI=mongodb://localhost:27017/awscert
   ```

3. **Create Telegram Bot**
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Follow instructions to get your bot token
   - Update `BOT_TOKEN` in `.env`

4. **Start the Bot**
   ```bash
   npm start
   ```

## Usage

1. Start a conversation with your bot on Telegram
2. Use `/start` command to begin
3. Select your desired AWS certificate
4. Enter your generated access code
5. Answer the multiple choice questions
6. View your results and quiz summary

## Bot Commands

### Basic Commands
- `/start` - Start a new quiz session and show available certificates
- `/help` - Display comprehensive help guide with all commands and features

### Quiz Management
- `/bookmark <question_number>` - Save a specific question for later review
- `/bookmarks` - View all your saved bookmarked questions  
- `/revision` - Review questions you answered incorrectly

### Interactive Features
- **Certificate Selection** - Choose from available certificates using inline buttons
- **Answer Selection** - Use A, B, C, D buttons to answer questions
- **Question Navigation** - Use "Next Question" button to continue
- **Quiz Restart** - Option to restart quiz after completion

### Features
- **Access Code System** - Enter generated access codes for personalized question sets
- **Progress Tracking** - Automatic saving of answers and wrong responses
- **Detailed Explanations** - Comprehensive explanations for each question
- **Session Management** - Maintains quiz state throughout the session

- `/start` - Start the bot and show certificate selection

## Quiz Flow

1. **Welcome & Certificate Selection**
   - Bot greets user and displays available certificates
   - User selects certificate using inline keyboard

2. **Access Code Entry**
   - User enters generated access code
   - Bot validates code and loads associated questions

3. **Quiz Questions**
   - Questions displayed with A, B, C, D options
   - Real-time score tracking
   - Immediate feedback on correct answers

4. **Wrong Answer Handling**
   - Shows correct answer
   - Displays detailed explanation
   - Option to continue to next question

5. **Results Summary**
   - Final score and percentage
   - Quiz duration and completion time
   - Option to take another quiz

## Database Collections

- `certificates` - Available AWS certificates
- `access-code-questions` - Questions assigned to access codes
- `quizzes` - Question bank
- `quiz-attempts` - Saved quiz results

## Architecture

- **Grammy Framework**: Modern Telegram bot framework
- **MongoDB**: Database for certificates, questions, and results
- **Session Management**: In-memory user session tracking
- **Inline Keyboards**: Interactive button-based navigation