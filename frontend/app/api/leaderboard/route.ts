import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const db = await connectToDatabase();

    // Get global leaderboard sorted by total points
    const leaderboard = await db.collection('users').aggregate([
      {
        $match: {
          quizzesTaken: { $gt: 0 } // Only include users who have taken at least one quiz
        }
      },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          profilePhotoUrl: 1,
          totalPoints: 1,
          quizzesTaken: 1,
          correctAnswers: 1,
          totalQuestions: 1,
          averageScore: 1,
          bestScore: 1,
          currentStreak: 1,
          bestStreak: 1,
          lastQuizDate: 1,
          rank: 1,
          // Calculate full name for display
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
          // Calculate accuracy percentage
          accuracy: {
            $cond: {
              if: { $gt: ["$totalQuestions", 0] },
              then: { $multiply: [{ $divide: ["$correctAnswers", "$totalQuestions"] }, 100] },
              else: 0
            }
          }
        }
      },
      {
        $sort: { totalPoints: -1, averageScore: -1, quizzesTaken: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]).toArray();

    // Add rank position to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      position: skip + index + 1
    }));

    // Get total count for pagination
    const totalUsers = await db.collection('users').countDocuments({
      quizzesTaken: { $gt: 0 }
    });

    // Get current user's position if requested
    const currentUserUsername = searchParams.get('currentUser');
    let currentUserPosition = null;
    
    if (currentUserUsername) {
      const currentUserRank = await db.collection('users').aggregate([
        {
          $match: {
            quizzesTaken: { $gt: 0 }
          }
        },
        {
          $sort: { totalPoints: -1, averageScore: -1, quizzesTaken: -1 }
        },
        {
          $group: {
            _id: null,
            users: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: {
            path: "$users",
            includeArrayIndex: "position"
          }
        },
        {
          $match: {
            "users.username": currentUserUsername
          }
        },
        {
          $project: {
            position: { $add: ["$position", 1] },
            user: "$users"
          }
        }
      ]).toArray();
      
      if (currentUserRank.length > 0) {
        currentUserPosition = {
          position: currentUserRank[0].position,
          user: currentUserRank[0].user
        };
      }
    }

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: skip + limit < totalUsers,
        hasPreviousPage: page > 1
      },
      currentUserPosition,
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
          totalPoints: 1,
          quizzesTaken: 1,
          correctAnswers: 1,
          totalQuestions: 1,
          averageScore: 1,
          bestScore: 1,
          currentStreak: 1,
          bestStreak: 1,
          lastQuizDate: 1,
          rank: 1,
          achievements: 1,
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

    // Get user's rank position
    const userRank = await db.collection('users').aggregate([
      {
        $match: {
          quizzesTaken: { $gt: 0 }
        }
      },
      {
        $sort: { totalPoints: -1, averageScore: -1, quizzesTaken: -1 }
      },
      {
        $group: {
          _id: null,
          users: { $push: "$$ROOT" }
        }
      },
      {
        $unwind: {
          path: "$users",
          includeArrayIndex: "position"
        }
      },
      {
        $match: {
          "users.username": username
        }
      },
      {
        $project: {
          position: { $add: ["$position", 1] }
        }
      }
    ]).toArray();

    const position = userRank.length > 0 ? userRank[0].position : null;

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
      user: {
        ...userStats[0],
        position
      },
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