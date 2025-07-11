import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    // Get certificates with question counts
    const certificateStats = await db.collection('quizzes').aggregate([
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateId',
          foreignField: '_id',
          as: 'certificate'
        }
      },
      {
        $unwind: '$certificate'
      },
      {
        $group: {
          _id: '$certificateId',
          name: { $first: '$certificate.name' },
          code: { $first: '$certificate.code' },
          questionCount: { $sum: 1 },
          lastQuestionAdded: { $max: '$createdAt' }
        }
      },
      {
        $sort: { questionCount: -1 }
      }
    ]).toArray();

    // Get access code statistics
    const accessCodeStats = await db.collection('access-code-questions').aggregate([
      {
        $group: {
          _id: '$generatedAccessCode',
          totalQuestions: { $sum: 1 },
          enabledQuestions: { 
            $sum: { $cond: ['$isEnabled', 1, 0] } 
          },
          disabledQuestions: { 
            $sum: { $cond: ['$isEnabled', 0, 1] } 
          }
        }
      },
      {
        $group: {
          _id: null,
          totalAccessCodes: { $sum: 1 },
          totalAssignments: { $sum: '$totalQuestions' },
          totalEnabled: { $sum: '$enabledQuestions' },
          totalDisabled: { $sum: '$disabledQuestions' },
          avgQuestionsPerCode: { $avg: '$totalQuestions' }
        }
      }
    ]).toArray();

    // Get quiz attempt statistics (from Telegram bot)
    const quizAttemptStats = await db.collection('quiz-attempts').aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          totalScore: { $sum: '$score' },
          totalPossible: { $sum: '$totalQuestions' },
          avgScore: { $avg: { $divide: ['$score', '$totalQuestions'] } }
        }
      },
      {
        $project: {
          totalAttempts: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          totalScore: 1,
          totalPossible: 1,
          avgScore: { 
            $ifNull: [
              { $multiply: ['$avgScore', 100] }, 
              0
            ] 
          }, // Convert to percentage with null check
          overallAccuracy: { 
            $ifNull: [
              { 
                $multiply: [
                  { $divide: ['$totalScore', '$totalPossible'] }, 
                  100
                ] 
              },
              0
            ]
          }
        }
      }
    ]).toArray();

    // Get recent quiz attempts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAttempts = await db.collection('quiz-attempts').aggregate([
      {
        $match: {
          attemptDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$attemptDate' },
            month: { $month: '$attemptDate' },
            day: { $dayOfMonth: '$attemptDate' }
          },
          attempts: { $sum: 1 },
          avgScore: { $avg: { $divide: ['$score', '$totalQuestions'] } }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      },
      {
        $limit: 30
      }
    ]).toArray();

    // Get user engagement statistics
    const userEngagement = await db.collection('quiz-attempts').aggregate([
      {
        $group: {
          _id: '$generatedAccessCode',
          uniqueUsers: { $addToSet: '$userId' },
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: { $divide: ['$score', '$totalQuestions'] } }
        }
      },
      {
        $project: {
          accessCode: '$_id',
          userCount: { $size: '$uniqueUsers' },
          totalAttempts: 1,
          avgScore: { 
            $cond: {
              if: { $eq: ['$avgScore', null] },
              then: 0,
              else: { $multiply: ['$avgScore', 100] }
            }
          }
        }
      },
      {
        $sort: { userCount: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // Get bookmark and wrong answer stats
    const bookmarkStats = await db.collection('bookmarks').aggregate([
      {
        $group: {
          _id: null,
          totalBookmarks: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          totalBookmarks: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]).toArray();

    const wrongAnswerStats = await db.collection('wrong-answers').aggregate([
      {
        $group: {
          _id: null,
          totalWrongAnswers: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          totalWrongAnswers: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]).toArray();

    // Get payee statistics
    const payeeStats = await db.collection('payees').aggregate([
      {
        $group: {
          _id: { 
            $ifNull: ['$paymentStatus', 'Unknown'] 
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          paymentStatus: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]).toArray();

    const response = {
      certificates: certificateStats,
      accessCodes: accessCodeStats[0] || {
        totalAccessCodes: 0,
        totalAssignments: 0,
        totalEnabled: 0,
        totalDisabled: 0,
        avgQuestionsPerCode: 0
      },
      quizAttempts: quizAttemptStats[0] || {
        totalAttempts: 0,
        uniqueUsers: 0,
        avgScore: 0,
        overallAccuracy: 0
      },
      recentActivity: recentAttempts,
      userEngagement: userEngagement,
      bookmarks: bookmarkStats[0] || { totalBookmarks: 0, uniqueUsers: 0 },
      wrongAnswers: wrongAnswerStats[0] || { totalWrongAnswers: 0, uniqueUsers: 0 },
      payees: payeeStats,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
