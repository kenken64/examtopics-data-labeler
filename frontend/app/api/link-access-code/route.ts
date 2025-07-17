import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function _connectToDatabaseOld() {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db('awscert');
}

// POST /api/link-access-code - Manually link a generated access code to certificate questions
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { payeeId, generatedAccessCode, forceRelink = false } = body;

    if (!payeeId && !generatedAccessCode) {
      return NextResponse.json({
        success: false,
        message: 'Either payeeId or generatedAccessCode is required'
      }, { status: 400 });
    }

    const db = await connectToDatabase();

    let payee;

    // Find the payee either by ID or by generated access code
    if (payeeId) {
      payee = await db.collection('payees').findOne({
        _id: new ObjectId(payeeId)
      });
    } else if (generatedAccessCode) {
      payee = await db.collection('payees').findOne({
        generatedAccessCode: generatedAccessCode
      });
    }

    if (!payee) {
      return NextResponse.json({
        success: false,
        message: 'Payee not found'
      }, { status: 404 });
    }

    if (payee.status !== 'paid') {
      return NextResponse.json({
        success: false,
        message: 'Payee must have paid status to link questions'
      }, { status: 400 });
    }

    if (!payee.generatedAccessCode) {
      return NextResponse.json({
        success: false,
        message: 'Payee must have a generated access code to link questions'
      }, { status: 400 });
    }

    // Check if this access code is already linked
    const existingLinks = await db.collection('access-code-questions').countDocuments({
      generatedAccessCode: payee.generatedAccessCode
    });

    if (existingLinks > 0 && !forceRelink) {
      return NextResponse.json({
        success: false,
        message: `Access code ${payee.generatedAccessCode} is already linked to ${existingLinks} questions. Use forceRelink=true to recreate the links.`,
        existingLinks
      }, { status: 409 });
    }

    // If force relinking, remove existing links
    if (forceRelink && existingLinks > 0) {
      await db.collection('access-code-questions').deleteMany({
        generatedAccessCode: payee.generatedAccessCode
      });
      console.log(`Removed ${existingLinks} existing links for access code ${payee.generatedAccessCode}`);
    }

    // Get all questions for the payee's certificate
    const questions = await db.collection('quizzes')
      .find({ certificateId: payee.certificateId.toString() })
      .sort({ question_no: 1 })
      .toArray();

    if (questions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No questions found for the certificate associated with this payee'
      }, { status: 404 });
    }

    // Create question assignments
    const questionAssignments = questions.map((question, index) => ({
      generatedAccessCode: payee.generatedAccessCode,
      payeeId: payee._id,
      certificateId: payee.certificateId,
      questionId: question._id,
      originalQuestionNo: question.question_no,
      assignedQuestionNo: index + 1, // Start from 1, sequential
      isEnabled: true, // All questions enabled by default
      assignedAt: new Date(),
      updatedAt: new Date(),
      sortOrder: index + 1 // For custom ordering
    }));

    // Insert the assignments
    const result = await db.collection('access-code-questions').insertMany(questionAssignments);

    // Get certificate details for response
    const certificate = await db.collection('certificates').findOne({
      _id: payee.certificateId
    });

    return NextResponse.json({
      success: true,
      message: `Successfully linked ${questionAssignments.length} questions to access code ${payee.generatedAccessCode}`,
      linkedQuestions: questionAssignments.length,
      accessCode: payee.generatedAccessCode,
      payee: {
        _id: payee._id,
        payeeName: payee.payeeName,
        originalAccessCode: payee.accessCode
      },
      certificate: certificate ? {
        _id: certificate._id,
        name: certificate.name,
        code: certificate.code
      } : null,
      insertedIds: result.insertedIds
    });

  } catch (error) {
    console.error('Error in link-access-code API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
});

// DELETE /api/link-access-code - Unlink a generated access code from certificate questions
export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const payeeId = searchParams.get('payeeId');
    const generatedAccessCode = searchParams.get('generatedAccessCode');

    if (!payeeId && !generatedAccessCode) {
      return NextResponse.json({
        success: false,
        message: 'Either payeeId or generatedAccessCode is required'
      }, { status: 400 });
    }

    const db = await connectToDatabase();

    let accessCode = generatedAccessCode;

    // If payeeId provided, get the access code from the payee
    if (payeeId) {
      const payee = await db.collection('payees').findOne({
        _id: new ObjectId(payeeId)
      });

      if (!payee || !payee.generatedAccessCode) {
        return NextResponse.json({
          success: false,
          message: 'Payee not found or has no generated access code'
        }, { status: 404 });
      }

      accessCode = payee.generatedAccessCode;
    }

    // Remove all question assignments for this access code
    const result = await db.collection('access-code-questions').deleteMany({
      generatedAccessCode: accessCode
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unlinked ${result.deletedCount} questions from access code ${accessCode}`,
      deletedCount: result.deletedCount,
      accessCode
    });

  } catch (error) {
    console.error('Error in link-access-code DELETE:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
});
