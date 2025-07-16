const { ObjectId } = require('mongodb');
const { InlineKeyboard } = require('grammy');
const { normalizeAnswer, isMultipleAnswerQuestion, validateMultipleAnswers, formatAnswerForDisplay } = require('../utils/answerUtils');

class QuizService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  async getQuestionsForAccessCode(accessCode, certificateId = null) {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      // Build match criteria - include certificate validation if provided
      const matchCriteria = { 
        generatedAccessCode: accessCode, 
        isEnabled: true 
      };
      
      // If certificateId is provided, validate that access code belongs to this certificate
      if (certificateId) {
        // Ensure certificateId is converted to ObjectId for proper comparison
        matchCriteria.certificateId = new ObjectId(certificateId);
      }
      
      // Get questions assigned to this access code and certificate
      const pipeline = [
        { $match: matchCriteria },
        {
          $lookup: {
            from: 'quizzes',
            localField: 'questionId',
            foreignField: '_id',
            as: 'questionDetails'
          }
        },
        { $unwind: '$questionDetails' },
        { $sort: { sortOrder: 1, assignedQuestionNo: 1 } },
        {
          $project: {
            _id: 1,
            assignedQuestionNo: 1,
            question: '$questionDetails.question',
            answers: '$questionDetails.answers',
            correctAnswer: '$questionDetails.correctAnswer',
            explanation: '$questionDetails.explanation'
          }
        }
      ];

      const questions = await db.collection('access-code-questions').aggregate(pipeline).toArray();
      
      // Process questions to parse answers into options format
      const processedQuestions = questions.map(q => {
        const options = this.parseAnswersToOptions(q.answers);
        return {
          ...q,
          options: options
        };
      });
      
      return processedQuestions;
    } catch (error) {
      console.error('Error fetching questions for access code:', error);
      return null;
    }
  }

  async checkAccessCodeExists(accessCode) {
    try {
      const db = await this.databaseService.connectToDatabase();
      const accessCodeRecord = await db.collection('access-code-questions').findOne({
        generatedAccessCode: accessCode
      });
      return !!accessCodeRecord;
    } catch (error) {
      console.error('Error checking access code existence:', error);
      return false;
    }
  }

  async getCertificateForAccessCode(accessCode) {
    try {
      const db = await this.databaseService.connectToDatabase();
      
      // Get the certificate associated with this access code
      const pipeline = [
        { $match: { generatedAccessCode: accessCode } },
        {
          $lookup: {
            from: 'certificates',
            localField: 'certificateId',
            foreignField: '_id',
            as: 'certificate'
          }
        },
        { $unwind: '$certificate' },
        { $limit: 1 },
        {
          $project: {
            name: '$certificate.name',
            code: '$certificate.code'
          }
        }
      ];

      const result = await db.collection('access-code-questions').aggregate(pipeline).toArray();
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting certificate for access code:', error);
      return null;
    }
  }

  parseAnswersToOptions(answersString) {
    if (!answersString) return { A: '', B: '', C: '', D: '', E: '', F: '' };
    
    const options = { A: '', B: '', C: '', D: '', E: '', F: '' };
    
    // Split by lines and process each line
    const lines = answersString.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match patterns like "- A. Option text" or "A. Option text"
      const match = trimmedLine.match(/^[-\s]*([A-F])\.\s*(.+)$/);
      if (match) {
        const [, letter, text] = match;
        options[letter] = text.trim();
      }
    }
    
    return options;
  }

  createQuestionKeyboard(currentQuestion, userSelections = []) {
    const keyboard = new InlineKeyboard();
    const isMultiple = isMultipleAnswerQuestion(currentQuestion.correctAnswer);
    
    if (isMultiple) {
      // Multiple answer layout with confirm/clear buttons
      keyboard
        .text('A', 'answer_A').text('B', 'answer_B').row()
        .text('C', 'answer_C').text('D', 'answer_D').row();
      
      // Add E and F if they exist
      if (currentQuestion.options.E || currentQuestion.options.F) {
        if (currentQuestion.options.E && currentQuestion.options.F) {
          keyboard.text('E', 'answer_E').text('F', 'answer_F').row();
        } else if (currentQuestion.options.E) {
          keyboard.text('E', 'answer_E').row();
        } else if (currentQuestion.options.F) {
          keyboard.text('F', 'answer_F').row();
        }
      }
      
      // Add control buttons
      keyboard
        .text('✅ Confirm Answer', 'confirm_answer').row()
        .text('🔄 Clear Selection', 'clear_selection').row();
    } else {
      // Single answer layout
      keyboard
        .text('A', 'answer_A').text('B', 'answer_B').row()
        .text('C', 'answer_C').text('D', 'answer_D').row();
      
      // Add E and F if they exist
      if (currentQuestion.options.E || currentQuestion.options.F) {
        if (currentQuestion.options.E && currentQuestion.options.F) {
          keyboard.text('E', 'answer_E').text('F', 'answer_F').row();
        } else if (currentQuestion.options.E) {
          keyboard.text('E', 'answer_E').row();
        } else if (currentQuestion.options.F) {
          keyboard.text('F', 'answer_F').row();
        }
      }
    }
    
    return keyboard;
  }

  formatQuestionText(currentQuestion, questionNumber, totalQuestions, correctAnswers, currentQuestionIndex, userSelections = []) {
    const isMultiple = isMultipleAnswerQuestion(currentQuestion.correctAnswer);
    
    // Format question options
    let questionOptions = 
      `A. ${currentQuestion.options.A || 'Option A not available'}\n` +
      `B. ${currentQuestion.options.B || 'Option B not available'}\n` +
      `C. ${currentQuestion.options.C || 'Option C not available'}\n` +
      `D. ${currentQuestion.options.D || 'Option D not available'}`;
    
    // Add E and F options if they exist
    if (currentQuestion.options.E) {
      questionOptions += `\nE. ${currentQuestion.options.E}`;
    }
    if (currentQuestion.options.F) {
      questionOptions += `\nF. ${currentQuestion.options.F}`;
    }
    
    // Add selection indicators for multiple choice
    if (isMultiple && userSelections.length > 0) {
      questionOptions += `\n\n📍 Selected: ${userSelections.join(', ')}`;
    }
    
    const questionText = 
      `📝 Question ${questionNumber}/${totalQuestions}\n` +
      `Score: ${correctAnswers}/${currentQuestionIndex}\n\n` +
      `${currentQuestion.question}\n\n` +
      questionOptions + `\n\n` +
      (isMultiple ? `⚠️ Multiple answers required: Select ${normalizeAnswer(currentQuestion.correctAnswer).length} options` : '💡 Select one answer');

    return questionText;
  }

  checkAnswer(selectedAnswers, correctAnswer) {
    const isMultiple = isMultipleAnswerQuestion(correctAnswer);
    
    if (isMultiple) {
      return validateMultipleAnswers(selectedAnswers, correctAnswer);
    } else {
      return selectedAnswers[0] === correctAnswer;
    }
  }

  formatAnswerExplanation(isCorrect, correctAnswer, explanation) {
    const correctDisplay = isMultipleAnswerQuestion(correctAnswer) 
      ? formatAnswerForDisplay(correctAnswer)
      : correctAnswer;
    
    let message = isCorrect ? '✅ Correct!' : '❌ Incorrect';
    message += `\n\n🔍 Correct Answer: ${correctDisplay}`;
    
    if (explanation) {
      message += `\n\n💡 Explanation:\n${explanation}`;
    }
    
    return message;
  }
}

module.exports = QuizService;