const { ObjectId } = require('mongodb');

class FeedbackService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Save user feedback for a question
   * @param {string} userId - Telegram user ID
   * @param {string} accessCode - Access code for the question set
   * @param {Object} questionData - Question details
   * @param {boolean} isCorrect - Whether the answer was correct
   * @param {number} difficultyRating - User's difficulty rating (1-5)
   * @param {string} textFeedback - User's text feedback (optional)
   * @param {string[]} selectedAnswers - User's selected answers
   * @param {string} correctAnswer - The correct answer
   * @param {number} questionNumber - Question number in the quiz
   */
  async saveFeedback(userId, accessCode, questionData, isCorrect, difficultyRating = null, textFeedback = null, selectedAnswers = [], correctAnswer = '', questionNumber = null) {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      const feedback = {
        userId: userId.toString(),
        accessCode: accessCode,
        questionId: new ObjectId(questionData._id),
        questionNumber: questionNumber || questionData.questionNumber || questionData.number,
        questionText: questionData.question,
        isCorrect: isCorrect,
        selectedAnswers: selectedAnswers,
        correctAnswer: correctAnswer,
        difficultyRating: difficultyRating,
        textFeedback: textFeedback,
        createdAt: new Date(),
        source: 'telegram'
      };

      await db.collection('question-feedback').insertOne(feedback);
      console.log(`✅ Saved feedback for user ${userId}, question ${feedback.questionNumber}, rating: ${difficultyRating}, text: ${textFeedback ? 'yes' : 'no'}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error saving feedback:', error);
      return false;
    }
  }

  /**
   * Save wrong answer to dedicated collection organized by access code
   * @param {string} userId - Telegram user ID
   * @param {string} accessCode - Access code for the question set
   * @param {Object} questionData - Question details
   * @param {string[]} selectedAnswers - User's selected answers
   * @param {string} correctAnswer - The correct answer
   * @param {number} questionNumber - Question number in the quiz
   */
  async saveWrongAnswer(userId, accessCode, questionData, selectedAnswers, correctAnswer, questionNumber = null) {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      const wrongAnswer = {
        userId: userId.toString(),
        accessCode: accessCode,
        questionId: new ObjectId(questionData._id),
        questionNumber: questionNumber || questionData.questionNumber || questionData.number,
        questionText: questionData.question,
        userAnswer: selectedAnswers,
        correctAnswer: correctAnswer,
        options: questionData.options || [],
        explanation: questionData.explanation || '',
        createdAt: new Date(),
        attemptCount: 1, // Track how many times user got this wrong
        lastAttemptAt: new Date(),
        source: 'telegram'
      };

      // Check if this wrong answer already exists for this user and question
      const existingWrongAnswer = await db.collection('wrong-answers').findOne({
        userId: userId.toString(),
        questionId: new ObjectId(questionData._id),
        accessCode: accessCode
      });

      if (existingWrongAnswer) {
        // Update existing record with new attempt
        await db.collection('wrong-answers').updateOne(
          { 
            userId: userId.toString(),
            questionId: new ObjectId(questionData._id),
            accessCode: accessCode
          },
          { 
            $set: {
              userAnswer: selectedAnswers,
              lastAttemptAt: new Date()
            },
            $inc: { attemptCount: 1 }
          }
        );
        console.log(`📝 Updated wrong answer for user ${userId}, question ${wrongAnswer.questionNumber} (attempt #${existingWrongAnswer.attemptCount + 1})`);
      } else {
        // Insert new wrong answer record
        await db.collection('wrong-answers').insertOne(wrongAnswer);
        console.log(`📝 Saved new wrong answer for user ${userId}, question ${wrongAnswer.questionNumber}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error saving wrong answer:', error);
      return false;
    }
  }

  /**
   * Get user's wrong answers for a specific access code
   * @param {string} userId - Telegram user ID
   * @param {string} accessCode - Access code to filter by
   * @returns {Array} Array of wrong answer records
   */
  async getUserWrongAnswers(userId, accessCode = null) {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      let query = { userId: userId.toString() };
      if (accessCode) {
        query.accessCode = accessCode;
      }

      const wrongAnswers = await db.collection('wrong-answers')
        .find(query)
        .sort({ lastAttemptAt: -1 })
        .toArray();

      return wrongAnswers;
    } catch (error) {
      console.error('❌ Error retrieving wrong answers:', error);
      return [];
    }
  }

  /**
   * Remove a wrong answer when user gets it correct
   * @param {string} userId - Telegram user ID
   * @param {string} questionId - Question ID
   * @param {string} accessCode - Access code
   */
  async removeWrongAnswer(userId, questionId, accessCode) {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      await db.collection('wrong-answers').deleteOne({
        userId: userId.toString(),
        questionId: new ObjectId(questionId),
        accessCode: accessCode
      });

      console.log(`✅ Removed wrong answer for user ${userId}, question ${questionId}`);
      return true;
    } catch (error) {
      console.error('❌ Error removing wrong answer:', error);
      return false;
    }
  }

  /**
   * Create feedback collection keyboard for difficulty rating
   * @param {string} questionIndex - Current question index for callback data
   * @returns {Object} Inline keyboard for feedback collection
   */
  createDifficultyRatingKeyboard(questionIndex) {
    return {
      inline_keyboard: [
        [
          { text: '😄 Very Easy (1)', callback_data: `feedback_difficulty_${questionIndex}_1` },
          { text: '🙂 Easy (2)', callback_data: `feedback_difficulty_${questionIndex}_2` }
        ],
        [
          { text: '😐 Medium (3)', callback_data: `feedback_difficulty_${questionIndex}_3` },
          { text: '😅 Hard (4)', callback_data: `feedback_difficulty_${questionIndex}_4` }
        ],
        [
          { text: '😰 Very Hard (5)', callback_data: `feedback_difficulty_${questionIndex}_5` }
        ],
        [
          { text: '⏭️ Skip Feedback', callback_data: `feedback_skip_${questionIndex}` }
        ]
      ]
    };
  }

  /**
   * Create keyboard for text feedback option
   * @param {string} questionIndex - Current question index for callback data
   * @returns {Object} Inline keyboard for text feedback option
   */
  createTextFeedbackKeyboard(questionIndex) {
    return {
      inline_keyboard: [
        [
          { text: '💬 Add Text Feedback', callback_data: `feedback_text_${questionIndex}` }
        ],
        [
          { text: '⏭️ Continue to Next Question', callback_data: `feedback_continue_${questionIndex}` }
        ],
        [
          { text: '⏭️ Skip All Feedback', callback_data: `feedback_skip_all_${questionIndex}` }
        ]
      ]
    };
  }

  /**
   * Format feedback collection message
   * @param {Object} questionData - Question details
   * @param {boolean} isCorrect - Whether the answer was correct
   * @param {number} questionNumber - Current question number
   * @param {number} totalQuestions - Total questions
   * @returns {string} Formatted message for feedback collection
   */
  formatFeedbackMessage(questionData, isCorrect, questionNumber, totalQuestions) {
    const statusEmoji = isCorrect ? '✅' : '❌';
    const statusText = isCorrect ? 'Correct!' : 'Incorrect';
    
    return `${statusEmoji} <b>${statusText}</b>\n\n` +
           `📊 Question ${questionNumber}/${totalQuestions}\n\n` +
           `📝 <b>Help us improve!</b>\n` +
           `How difficult was this question for you?\n\n` +
           `<i>Rating this question helps other learners and improves the quiz experience.</i>`;
  }

  /**
   * Format text feedback prompt message
   * @param {number} questionNumber - Current question number
   * @param {number} totalQuestions - Total questions
   * @param {number} difficultyRating - Previously selected difficulty rating
   * @returns {string} Formatted message for text feedback prompt
   */
  formatTextFeedbackPrompt(questionNumber, totalQuestions, difficultyRating) {
    const ratingText = this.getDifficultyText(difficultyRating);
    
    return `📝 <b>Additional Feedback</b>\n\n` +
           `📊 Question ${questionNumber}/${totalQuestions}\n` +
           `⭐ Difficulty Rating: ${ratingText}\n\n` +
           `💬 Would you like to share additional thoughts about this question?\n\n` +
           `<i>You can share insights about question clarity, relevance, or any suggestions for improvement.</i>`;
  }

  /**
   * Get difficulty text from rating number
   * @param {number} rating - Difficulty rating (1-5)
   * @returns {string} Text representation of difficulty
   */
  getDifficultyText(rating) {
    const difficultyMap = {
      1: '😄 Very Easy',
      2: '🙂 Easy',
      3: '😐 Medium',
      4: '😅 Hard',
      5: '😰 Very Hard'
    };
    return difficultyMap[rating] || 'Unknown';
  }
}

module.exports = FeedbackService;
