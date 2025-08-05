import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { transformQuestionsForFrontend } from '../../utils/questionTransform';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { buildUserFilter, isAdmin } from '@/lib/role-filter';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function connectToDatabaseOld() {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db('awscert');
}

// GET /api/saved-questions - Search questions by access code or list access codes with payee info
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const accessCode = searchParams.get('accessCode');
    const certificateCode = searchParams.get('certificateCode');
    const listAccessCodes = searchParams.get('listAccessCodes') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Question range filtering parameters
    const questionFrom = searchParams.get('questionFrom');
    const questionTo = searchParams.get('questionTo');
    const questionFromNum = questionFrom ? parseInt(questionFrom) : null;
    const questionToNum = questionTo ? parseInt(questionTo) : null;

    const db = await connectToDatabase();

    // If requesting list of access codes with payee info
    if (listAccessCodes) {
      // Build user-specific filter based on role permissions
      const userFilter = buildUserFilter(request);
      
      const pipeline = [
        // Apply role-based filtering first
        { 
          $match: { 
            status: 'paid',
            ...userFilter // Add RBAC filtering - admins see all, users see only their own
          } 
        },
        // Lookup certificate information
        {
          $lookup: {
            from: 'certificates',
            localField: 'certificateId',
            foreignField: '_id',
            as: 'certificate'
          }
        },
        // Unwind certificate array
        { $unwind: '$certificate' },
        // Project required fields
        {
          $project: {
            _id: 1,
            payeeName: 1,
            originalAccessCode: '$accessCode', // Map accessCode to originalAccessCode
            generatedAccessCode: 1,
            amountPaid: 1,
            status: 1,
            createdAt: 1,
            userId: 1, // Include userId for debugging/verification
            certificateCode: '$certificate.code', // Map certificate code
            certificateTitle: '$certificate.name', // Map certificate title
            'certificate._id': 1
          }
        },
        // Sort by creation date (newest first)
        { $sort: { createdAt: -1 } }
      ];

      const accessCodes = await db.collection('payees').aggregate(pipeline).toArray();
      
      // Check which access codes are linked to questions
      const accessCodesWithLinkStatus = await Promise.all(
        accessCodes.map(async (accessCode) => {
          if (accessCode.generatedAccessCode) {
            const linkCount = await db.collection('access-code-questions').countDocuments({
              generatedAccessCode: accessCode.generatedAccessCode
            });
            return { ...accessCode, isLinkedToQuestions: linkCount > 0 };
          }
          return { ...accessCode, isLinkedToQuestions: false };
        })
      );
      
      return NextResponse.json({
        success: true,
        accessCodes: accessCodesWithLinkStatus,
        userInfo: {
          email: request.user.email,
          role: request.user.role,
          isAdmin: isAdmin(request)
        },
        filterApplied: isAdmin(request) ? 'All access codes (admin)' : 'User access codes only'
      });
    }

    // If searching by access code
    if (accessCode) {
      // Build user-specific filter based on role permissions
      const userFilter = buildUserFilter(request);
      
      // First find the payee with this access code, applying RBAC filtering
      const payee = await db.collection('payees').findOne({
        $and: [
          {
            $or: [
              { accessCode: accessCode },
              { generatedAccessCode: accessCode }
            ]
          },
          { status: 'paid' }, // Only allow access for paid customers
          userFilter // Apply role-based filtering - users can only access their own access codes
        ]
      });

      if (!payee) {
        return NextResponse.json({
          success: false,
          message: 'Access code not found, not authorized, or access denied'
        }, { status: 404 });
      }

      // Get certificate information
      const certificate = await db.collection('certificates').findOne({
        _id: payee.certificateId
      });

      if (!certificate) {
        return NextResponse.json({
          success: false,
          message: 'Certificate not found'
        }, { status: 404 });
      }

      // Check if this is a generated access code - if so, use access-code-questions
      let questions;
      if (payee.generatedAccessCode === accessCode) {
        // Use the new access-code-questions collection for generated codes
        let baseMatchCondition: any = {
          generatedAccessCode: accessCode,
          isEnabled: true 
        };
        
        // Add question range filtering if specified
        if (questionFromNum !== null || questionToNum !== null) {
          const questionRangeCondition: any = {};
          if (questionFromNum !== null) {
            questionRangeCondition.$gte = questionFromNum;
          }
          if (questionToNum !== null) {
            questionRangeCondition.$lte = questionToNum;
          }
          baseMatchCondition.assignedQuestionNo = questionRangeCondition;
        }
        
        const pipeline = [
          { $match: baseMatchCondition },
          // Lookup question details
          {
            $lookup: {
              from: 'quizzes',
              localField: 'questionId',
              foreignField: '_id',
              as: 'questionDetails'
            }
          },
          { $unwind: '$questionDetails' },
          // Sort by assigned order
          { $sort: { sortOrder: 1, assignedQuestionNo: 1 } },
          // Project final structure
          {
            $project: {
              _id: '$questionDetails._id',
              question_no: '$assignedQuestionNo', // Use assigned question number
              question: '$questionDetails.question',
              answers: '$questionDetails.answers', // Include answers field for step questions
              options: '$questionDetails.options',
              correctAnswer: '$questionDetails.correctAnswer',
              explanation: '$questionDetails.explanation',
              createdAt: '$questionDetails.createdAt',
              originalQuestionNo: '$questionDetails.question_no',
              isEnabled: 1,
              sortOrder: 1,
              type: '$questionDetails.type', // Include type field
              difficulty: '$questionDetails.difficulty', // Include difficulty field
              tags: '$questionDetails.tags' // Include tags field
            }
          }
        ];

        const assignedQuestions = await db.collection('access-code-questions').aggregate(pipeline).toArray();
        
        // Get total count for pagination
        const totalCountPipeline = [
          { $match: baseMatchCondition },
          { $count: "total" }
        ];
        const totalCountResult = await db.collection('access-code-questions').aggregate(totalCountPipeline).toArray();
        const totalQuestions = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
        
        // Apply pagination to the main pipeline
        const paginatedPipeline = [
          ...pipeline,
          { $skip: skip },
          { $limit: limit }
        ];
        
        const paginatedQuestions = await db.collection('access-code-questions').aggregate(paginatedPipeline).toArray();
        questions = paginatedQuestions;
        
        return NextResponse.json({
          success: true,
          payee: {
            _id: payee._id,
            payeeName: payee.payeeName,
            accessCode: payee.accessCode,
            generatedAccessCode: payee.generatedAccessCode,
            isGeneratedCode: payee.generatedAccessCode === accessCode
          },
          certificate: {
            _id: certificate._id,
            name: certificate.name,
            code: certificate.code
          },
          questions: transformQuestionsForFrontend(questions),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalQuestions / limit),
            totalQuestions,
            questionsPerPage: limit,
            hasNextPage: skip + limit < totalQuestions,
            hasPrevPage: page > 1
          }
        });
      } else {
        // Use original method for original access codes
        let queryCondition: any = { certificateId: payee.certificateId.toString() };
        
        // Add question range filtering if specified
        if (questionFromNum !== null || questionToNum !== null) {
          const questionRangeCondition: any = {};
          if (questionFromNum !== null) {
            questionRangeCondition.$gte = questionFromNum;
          }
          if (questionToNum !== null) {
            questionRangeCondition.$lte = questionToNum;
          }
          queryCondition.question_no = questionRangeCondition;
        }
        
        const totalQuestions = await db.collection('quizzes')
          .countDocuments(queryCondition);
        
        const allQuestions = await db.collection('quizzes')
          .find(queryCondition)
          .sort({ question_no: 1 })
          .skip(skip)
          .limit(limit)
          .toArray();
        
        questions = allQuestions;
        
        return NextResponse.json({
          success: true,
          payee: {
            _id: payee._id,
            payeeName: payee.payeeName,
            accessCode: payee.accessCode,
            generatedAccessCode: payee.generatedAccessCode,
            isGeneratedCode: payee.generatedAccessCode === accessCode
          },
          certificate: {
            _id: certificate._id,
            name: certificate.name,
            code: certificate.code
          },
          questions: transformQuestionsForFrontend(questions),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalQuestions / limit),
            totalQuestions,
            questionsPerPage: limit,
            hasNextPage: skip + limit < totalQuestions,
            hasPrevPage: page > 1
          }
        });
      }
    }

    // If searching by certificate code
    if (certificateCode) {
      // Find certificate by code
      const certificate = await db.collection('certificates').findOne({
        code: certificateCode
      });

      if (!certificate) {
        return NextResponse.json({
          success: false,
          message: 'Certificate not found'
        }, { status: 404 });
      }

      // Count total questions for this certificate
      const totalQuestions = await db.collection('quizzes')
        .countDocuments({ certificateId: certificate._id.toString() });

      // Find paginated questions for this certificate
      const questions = await db.collection('quizzes')
        .find({ certificateId: certificate._id.toString() })
        .sort({ question_no: 1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Calculate pagination info
      const totalPages = Math.ceil(totalQuestions / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return NextResponse.json({
        success: true,
        certificate: {
          _id: certificate._id,
          name: certificate.name,
          code: certificate.code
        },
        questions: transformQuestionsForFrontend(questions),
        pagination: {
          currentPage: page,
          totalPages,
          totalQuestions,
          questionsPerPage: limit,
          hasNextPage,
          hasPrevPage
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Please provide accessCode, certificateCode, or set listAccessCodes=true'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in saved questions API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
});

// PATCH /api/saved-questions - Update question details
export const PATCH = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { questionId, correctAnswer, explanation } = await request.json();

    if (!questionId) {
      return NextResponse.json({
        success: false,
        message: 'Question ID is required'
      }, { status: 400 });
    }

    const db = await connectToDatabase();

    // Update the question in the quizzes collection
    const updateResult = await db.collection('quizzes').updateOne(
      { _id: new ObjectId(questionId) },
      {
        $set: {
          correctAnswer: correctAnswer,
          explanation: explanation,
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Question not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
});
