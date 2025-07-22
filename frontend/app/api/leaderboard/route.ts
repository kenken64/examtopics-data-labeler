import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const db = await connectToDatabase();

    // Get leaderboard combining both registered users and QuizBlitz players
    const userLeaderboard = await db.collection('users').aggregate([
      {
        $match: {
          $or: [
            { quizzesTaken: { $gt: 0 } },
            { totalPoints: { $gt: 0 } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          firstName: 1,
          lastName: 1,
          profilePhotoUrl: 1,
          totalPoints: { $ifNull: ['$totalPoints', 0] },
          quizzesTaken: { $ifNull: ['$quizzesTaken', 0] },
          correctAnswers: { $ifNull: ['$correctAnswers', 0] },
          totalQuestions: { $ifNull: ['$totalQuestions', 0] },
          averageScore: { $ifNull: ['$averageScore', 0] },
          bestScore: { $ifNull: ['$bestScore', 0] },
          currentStreak: { $ifNull: ['$currentStreak', 0] },
          bestStreak: { $ifNull: ['$bestStreak', 0] },
          lastQuizDate: 1,
          rank: { $ifNull: ['$rank', 'Beginner'] },
          source: { $literal: 'registered' },
          displayName: {
            $cond: {
              if: { $and: [{ $ne: ["$firstName", ""] }, { $ne: ["$lastName", ""] }] },
              then: { $concat: ["$firstName", " ", "$lastName"] },
              else: {
                $cond: {
                  if: { $ne: ["$firstName", ""] },
                  then: "$firstName",
                  else: {
                    $cond: {
                      if: { $ne: ["$lastName", ""] },
                      then: "$lastName",
                      else: "$username"
                    }
                  }
                }
              }
            }
          },
          accuracy: {
            $cond: {
              if: { $gt: ["$totalQuestions", 0] },
              then: { $multiply: [{ $divide: ["$correctAnswers", "$totalQuestions"] }, 100] },
              else: 0
            }
          }
        }
      }
    ]).toArray();

    // Get top QuizBlitz players from completed sessions
    const quizBlitzLeaderboard = await db.collection('quizSessions').aggregate([
      {
        $match: {
          status: 'finished',
          playerAnswers: { $exists: true, $ne: {} }
        }
      },
      {
        $addFields: {
          playerAnswersArray: { $objectToArray: "$playerAnswers" }
        }
      },
      {
        $unwind: {
          path: "$playerAnswersArray",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $addFields: {
          playerId: "$playerAnswersArray.k",
          playerData: "$playerAnswersArray.v",
          questionAnswersArray: { $objectToArray: "$playerAnswersArray.v" }
        }
      },
      {
        $unwind: {
          path: "$questionAnswersArray",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          "questionAnswersArray.v.score": { $exists: true }
        }
      },
      {
        $group: {
          _id: "$playerId",
          playerName: { $first: { $ifNull: ["$questionAnswersArray.v.playerName", "$playerId"] } },
          totalScore: { $sum: "$questionAnswersArray.v.score" },
          totalAnswers: { $sum: 1 },
          correctAnswers: { $sum: { $cond: ["$questionAnswersArray.v.isCorrect", 1, 0] } },
          gamesPlayed: { $addToSet: "$quizCode" },
          lastPlayed: { $max: "$questionAnswersArray.v.timestamp" }
        }
      },
      {
        $project: {
          _id: { $concat: ["quizblitz_", "$_id"] },
          username: "$_id",
          displayName: "$playerName",
          totalPoints: "$totalScore",
          quizzesTaken: { $size: "$gamesPlayed" },
          correctAnswers: "$correctAnswers",
          totalQuestions: "$totalAnswers",
          averageScore: {
            $cond: {
              if: { $gt: ["$totalAnswers", 0] },
              then: { $multiply: [{ $divide: ["$correctAnswers", "$totalAnswers"] }, 100] },
              else: 0
            }
          },
          bestScore: {
            $cond: {
              if: { $gt: ["$totalAnswers", 0] },
              then: { $multiply: [{ $divide: ["$correctAnswers", "$totalAnswers"] }, 100] },
              else: 0
            }
          },
          currentStreak: { $literal: 0 },
          bestStreak: { $literal: 0 },
          lastQuizDate: "$lastPlayed",
          rank: { $literal: "QuizBlitz Player" },
          source: { $literal: "quizblitz" },
          profilePhotoUrl: { $literal: null },
          firstName: { $literal: "" },
          lastName: { $literal: "" },
          accuracy: {
            $cond: {
              if: { $gt: ["$totalAnswers", 0] },
              then: { $multiply: [{ $divide: ["$correctAnswers", "$totalAnswers"] }, 100] },
              else: 0
            }
          }
        }
      },
      {
        $match: {
          totalPoints: { $gt: 0 }
        }
      }
    ]).toArray();

    // Combine and sort leaderboards
    const combinedLeaderboard = [...userLeaderboard, ...quizBlitzLeaderboard];
    combinedLeaderboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      return b.quizzesTaken - a.quizzesTaken;
    });

    // Apply pagination
    const paginatedLeaderboard = combinedLeaderboard.slice(skip, skip + limit);
    
    // Add rank position to each user
    const rankedLeaderboard = paginatedLeaderboard.map((user, index) => ({
      ...user,
      position: skip + index + 1
    }));

    const totalUsers = combinedLeaderboard.length;

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: skip + limit < totalUsers,
        hasPreviousPage: page > 1
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

// Get user's personal statistics
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Get user's detailed statistics
    const userStats = await db.collection('users').aggregate([
      {
        $match: { username }
      },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          profilePhotoUrl: 1,
          totalPoints: { $ifNull: ['$totalPoints', 0] },
          quizzesTaken: { $ifNull: ['$quizzesTaken', 0] },
          correctAnswers: { $ifNull: ['$correctAnswers', 0] },
          totalQuestions: { $ifNull: ['$totalQuestions', 0] },
          averageScore: { $ifNull: ['$averageScore', 0] },
          bestScore: { $ifNull: ['$bestScore', 0] },
          currentStreak: { $ifNull: ['$currentStreak', 0] },
          bestStreak: { $ifNull: ['$bestStreak', 0] },
          lastQuizDate: 1,
          rank: { $ifNull: ['$rank', 'Beginner'] },
          achievements: { $ifNull: ['$achievements', []] },
          displayName: {
            $cond: {
              if: { $and: [{ $ne: ["$firstName", ""] }, { $ne: ["$lastName", ""] }] },
              then: { $concat: ["$firstName", " ", "$lastName"] },
              else: {
                $cond: {
                  if: { $ne: ["$firstName", ""] },
                  then: "$firstName",
                  else: {
                    $cond: {
                      if: { $ne: ["$lastName", ""] },
                      then: "$lastName",
                      else: "$username"
                    }
                  }
                }
              }
            }
          },
          accuracy: {
            $cond: {
              if: { $gt: ["$totalQuestions", 0] },
              then: { $multiply: [{ $divide: ["$correctAnswers", "$totalQuestions"] }, 100] },
              else: 0
            }
          }
        }
      }
    ]).toArray();

    if (userStats.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get recent quiz attempts
    const recentQuizzes = await db.collection('quiz-attempts')
      .find({ userId: username })
      .sort({ createdAt: -1 })
      .limit(10)
      .project({
        certificateName: 1,
        certificateCode: 1,
        totalQuestions: 1,
        correctAnswers: 1,
        percentage: 1,
        duration: 1,
        createdAt: 1,
        accessCode: 1
      })
      .toArray();

    return NextResponse.json({
      user: userStats[0],
      recentQuizzes,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    );
  }
}
