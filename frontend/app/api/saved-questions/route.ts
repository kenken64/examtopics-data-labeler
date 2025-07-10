import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { transformQuestionsForFrontend } from '../../utils/questionTransform';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function connectToDatabase() {
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

    const db = await connectToDatabase();

    // If requesting list of access codes with payee info
    if (listAccessCodes) {
      const pipeline = [
        // Match only paid payees
        { $match: { status: 'paid' } },
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
        accessCodes: accessCodesWithLinkStatus
      });
    }

    // If searching by access code
    if (accessCode) {
      // First find the payee with this access code
      const payee = await db.collection('payees').findOne({
        $or: [
          { accessCode: accessCode },
          { generatedAccessCode: accessCode }
        ],
        status: 'paid' // Only allow access for paid customers
      });

      if (!payee) {
        return NextResponse.json({
          success: false,
          message: 'Access code not found or not authorized'
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
        const pipeline = [
          { 
            $match: { 
              generatedAccessCode: accessCode,
              isEnabled: true 
            } 
          },
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
              options: '$questionDetails.options',
              correctAnswer: '$questionDetails.correctAnswer',
              explanation: '$questionDetails.explanation',
              createdAt: '$questionDetails.createdAt',
              originalQuestionNo: '$questionDetails.question_no',
              isEnabled: 1,
              sortOrder: 1
            }
          }
        ];

        const assignedQuestions = await db.collection('access-code-questions').aggregate(pipeline).toArray();
        questions = assignedQuestions;
      } else {
        // Use original method for original access codes
        const allQuestions = await db.collection('quizzes')
          .find({ certificateId: payee.certificateId.toString() })
          .sort({ question_no: 1 })
          .toArray();
        
        questions = allQuestions;
      }

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
        totalQuestions: questions.length
      });
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

      // Find all questions for this certificate
      const questions = await db.collection('quizzes')
        .find({ certificateId: certificate._id.toString() })
        .sort({ question_no: 1 })
        .toArray();

      return NextResponse.json({
        success: true,
        certificate: {
          _id: certificate._id,
          name: certificate.name,
          code: certificate.code
        },
        questions: transformQuestionsForFrontend(questions),
        totalQuestions: questions.length
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
