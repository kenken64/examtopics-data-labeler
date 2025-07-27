import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { buildUserFilter, isAdmin } from '@/lib/role-filter';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert');
  
  try {
    await client.connect();
    const db = client.db('awscert');
    
    console.log('🏠 Dashboard API called by:', request.user.email, 'Role:', request.user.role);
    
    // Build user filter for role-based access
    const userFilter = buildUserFilter(request);
    const isUserAdmin = isAdmin(request);
    
    console.log('🔒 User filter applied:', JSON.stringify(userFilter));
    
    // Get certificates with question counts (no user filtering needed for certificates)
    const certificateStats = await db.collection('quizzes').aggregate([
      {
        $addFields: {
          certificateObjectId: { $toObjectId: '$certificateId' }
        }
      },
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateObjectId',
          foreignField: '_id',
          as: 'certificate'
        }
      },
      {
        $unwind: '$certificate'
      },
      {
        $group: {
          _id: '$certificateObjectId',
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

    // Get access code statistics (filtered by user role)
    const accessCodeStatsFilter = { ...userFilter };
    const accessCodeStats = await db.collection('access-code-questions').aggregate([
      {
        $match: accessCodeStatsFilter // Apply role-based filtering
      },
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

    // Get quiz attempt statistics (filtered by user role if not admin)
    const quizAttemptFilter = isUserAdmin ? {} : { 
      accessCode: { 
        $in: await db.collection('payees').distinct('generatedAccessCode', userFilter) 
      }
    };
    
    const quizAttemptStats = await db.collection('quiz-attempts').aggregate([
      {
        $match: quizAttemptFilter // Apply role-based filtering for quiz attempts
      },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          totalScore: { $sum: '$correctAnswers' },
          totalPossible: { $sum: '$totalQuestions' },
          avgScore: { $avg: { $divide: ['$correctAnswers', '$totalQuestions'] } }
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

    // Get recent quiz attempts (last 30 days, filtered by user role)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAttemptsFilter = {
      createdAt: { $gte: thirtyDaysAgo },
      ...quizAttemptFilter // Apply same role-based filtering
    };
    
    const recentAttempts = await db.collection('quiz-attempts').aggregate([
      {
        $match: recentAttemptsFilter
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          attempts: { $sum: 1 },
          avgScore: { $avg: { $divide: ['$correctAnswers', '$totalQuestions'] } }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      },
      {
        $limit: 30
      }
    ]).toArray();

    // Get user engagement statistics (filtered by user role)
    const userEngagement = await db.collection('quiz-attempts').aggregate([
      {
        $match: quizAttemptFilter // Apply role-based filtering
      },
      {
        $group: {
          _id: '$accessCode',
          uniqueUsers: { $addToSet: '$userId' },
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: { $divide: ['$correctAnswers', '$totalQuestions'] } }
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

    // Get bookmark and wrong answer stats (filtered by user role)
    // For non-admin users, only show stats for their own access codes
    const userAccessCodes = isUserAdmin ? null : await db.collection('payees').distinct('generatedAccessCode', userFilter);
    
    const bookmarkFilter = isUserAdmin ? {} : { 
      accessCode: { $in: userAccessCodes } 
    };
    
    const bookmarkStats = await db.collection('bookmarks').aggregate([
      {
        $match: bookmarkFilter
      },
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
        $match: bookmarkFilter // Apply same role-based filtering
      },
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

    // Get payee statistics (filtered by user role)
    const payeeStats = await db.collection('payees').aggregate([
      {
        $match: userFilter // Apply role-based filtering to payees
      },
      {
        $group: {
          _id: { 
            $ifNull: ['$status', 'Unknown'] 
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

    // Get PDF attachment statistics
    const pdfStats = await db.collection('certificates').aggregate([
      {
        $addFields: {
          hasPdf: {
            $and: [
              { $ne: ['$pdfFileUrl', null] },
              { $ne: ['$pdfFileUrl', ''] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$hasPdf',
          count: { $sum: 1 },
          certificates: {
            $push: {
              _id: '$_id',
              name: '$name',
              code: '$code',
              pdfFileName: '$pdfFileName'
            }
          }
        }
      },
      {
        $sort: { _id: -1 } // true first, then false
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
      pdfAttachments: pdfStats,
      lastUpdated: new Date().toISOString(),
      userInfo: {
        email: request.user.email,
        role: request.user.role,
        isAdmin: isUserAdmin
      },
      filterApplied: isUserAdmin ? 'All data (admin)' : 'User data only'
    };

    console.log('📊 Dashboard response prepared for:', request.user.role);
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
});
