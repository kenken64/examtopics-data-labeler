import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { transformQuestionsForFrontend } from '../../utils/questionTransform';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/awscert';

async function connectToDatabase() {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db('awscert');
}

// GET /api/access-code-questions - Get questions assigned to a generated access code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generatedAccessCode = searchParams.get('generatedAccessCode');
    const includeDisabled = searchParams.get('includeDisabled') === 'true';

    if (!generatedAccessCode) {
      return NextResponse.json({
        success: false,
        message: 'Generated access code is required'
      }, { status: 400 });
    }

    const db = await connectToDatabase();

    // Build match conditions
    const matchConditions: any = { generatedAccessCode };
    if (!includeDisabled) {
      matchConditions.isEnabled = true;
    }

    // Get assigned questions with question details
    const pipeline = [
      { $match: matchConditions },
      // Lookup question details
      {
        $lookup: {
          from: 'quizzes',
          let: { questionId: '$questionId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$questionId'] } } }
          ],
          as: 'questionDetails'
        }
      },
      { $unwind: '$questionDetails' },
      // Lookup payee details
      {
        $lookup: {
          from: 'payees',
          localField: 'payeeId',
          foreignField: '_id',
          as: 'payeeDetails'
        }
      },
      { $unwind: '$payeeDetails' },
      // Lookup certificate details
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateId',
          foreignField: '_id',
          as: 'certificateDetails'
        }
      },
      { $unwind: '$certificateDetails' },
      // Sort by assigned question number/sort order
      { $sort: { sortOrder: 1, assignedQuestionNo: 1 } },
      // Project final structure
      {
        $project: {
          _id: 1,
          generatedAccessCode: 1,
          assignedQuestionNo: 1,
          originalQuestionNo: '$questionDetails.question_no',
          isEnabled: 1,
          sortOrder: 1,
          assignedAt: 1,
          updatedAt: 1,
          question: {
            _id: '$questionDetails._id',
            question: '$questionDetails.question',
            options: '$questionDetails.options',
            correctAnswer: '$questionDetails.correctAnswer',
            explanation: '$questionDetails.explanation',
            createdAt: '$questionDetails.createdAt'
          },
          payee: {
            _id: '$payeeDetails._id',
            payeeName: '$payeeDetails.payeeName',
            originalAccessCode: '$payeeDetails.accessCode'
          },
          certificate: {
            _id: '$certificateDetails._id',
            name: '$certificateDetails.name',
            code: '$certificateDetails.code'
          }
        }
      }
    ];

    const assignedQuestions = await db.collection('access-code-questions').aggregate(pipeline).toArray();

    if (assignedQuestions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No questions found for this generated access code'
      }, { status: 404 });
    }

    // Get summary stats
    const statsResult = await db.collection('access-code-questions').aggregate([
      { $match: { generatedAccessCode } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          enabledQuestions: { $sum: { $cond: ['$isEnabled', 1, 0] } },
          disabledQuestions: { $sum: { $cond: ['$isEnabled', 0, 1] } }
        }
      }
    ]).toArray();

    const stats = statsResult[0] || { totalQuestions: 0, enabledQuestions: 0, disabledQuestions: 0 };

    return NextResponse.json({
      success: true,
      generatedAccessCode,
      questions: transformQuestionsForFrontend(assignedQuestions),
      stats: {
        totalQuestions: stats.totalQuestions,
        enabledQuestions: stats.enabledQuestions,
        disabledQuestions: stats.disabledQuestions
      },
      payee: assignedQuestions[0]?.payee,
      certificate: assignedQuestions[0]?.certificate
    });

  } catch (error) {
    console.error('Error in access-code-questions GET:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT /api/access-code-questions - Update question assignments (reorder, enable/disable)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { generatedAccessCode, updates } = body;

    if (!generatedAccessCode || !updates || !Array.isArray(updates)) {
      return NextResponse.json({
        success: false,
        message: 'Generated access code and updates array are required'
      }, { status: 400 });
    }

    const db = await connectToDatabase();

    // Verify the generated access code exists
    const existingRecord = await db.collection('access-code-questions').findOne({
      generatedAccessCode
    });

    if (!existingRecord) {
      return NextResponse.json({
        success: false,
        message: 'Generated access code not found'
      }, { status: 404 });
    }

    // Perform bulk updates
    const bulkOps = updates.map(update => {
      const { _id, assignedQuestionNo, isEnabled, sortOrder } = update;
      
      if (!_id) {
        throw new Error('Question assignment ID is required for updates');
      }

      const updateDoc: any = { updatedAt: new Date() };
      
      if (assignedQuestionNo !== undefined) {
        updateDoc.assignedQuestionNo = assignedQuestionNo;
      }
      
      if (isEnabled !== undefined) {
        updateDoc.isEnabled = isEnabled;
      }
      
      if (sortOrder !== undefined) {
        updateDoc.sortOrder = sortOrder;
      }

      return {
        updateOne: {
          filter: { 
            _id: new ObjectId(_id),
            generatedAccessCode 
          },
          update: { $set: updateDoc }
        }
      };
    });

    const result = await db.collection('access-code-questions').bulkWrite(bulkOps);

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} question assignments`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });

  } catch (error) {
    console.error('Error in access-code-questions PUT:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/access-code-questions - Add new question assignments to a generated access code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generatedAccessCode, questionIds } = body;

    if (!generatedAccessCode || !questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json({
        success: false,
        message: 'Generated access code and questionIds array are required'
      }, { status: 400 });
    }

    const db = await connectToDatabase();

    // Get payee and certificate info for this generated access code
    const payee = await db.collection('payees').findOne({
      generatedAccessCode,
      status: 'paid'
    });

    if (!payee) {
      return NextResponse.json({
        success: false,
        message: 'Generated access code not found or not authorized'
      }, { status: 404 });
    }

    // Get current max sort order for this access code
    const maxSortResult = await db.collection('access-code-questions').aggregate([
      { $match: { generatedAccessCode } },
      { $group: { _id: null, maxSort: { $max: '$sortOrder' } } }
    ]).toArray();

    const maxSort = maxSortResult[0]?.maxSort || 0;

    // Get current max assigned question number
    const maxAssignedResult = await db.collection('access-code-questions').aggregate([
      { $match: { generatedAccessCode } },
      { $group: { _id: null, maxAssigned: { $max: '$assignedQuestionNo' } } }
    ]).toArray();

    const maxAssigned = maxAssignedResult[0]?.maxAssigned || 0;

    // Create new assignments
    const newAssignments = [];
    
    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i];
      
      // Check if this question is already assigned
      const existing = await db.collection('access-code-questions').findOne({
        generatedAccessCode,
        questionId: new ObjectId(questionId)
      });

      if (existing) {
        continue; // Skip if already assigned
      }

      // Get question details
      const question = await db.collection('quizzes').findOne({
        _id: new ObjectId(questionId)
      });

      if (!question) {
        continue; // Skip if question not found
      }

      newAssignments.push({
        generatedAccessCode,
        payeeId: payee._id,
        certificateId: payee.certificateId,
        questionId: new ObjectId(questionId),
        originalQuestionNo: question.question_no,
        assignedQuestionNo: maxAssigned + i + 1,
        isEnabled: true,
        assignedAt: new Date(),
        updatedAt: new Date(),
        sortOrder: maxSort + i + 1
      });
    }

    if (newAssignments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No new questions to assign (all questions already assigned or not found)'
      }, { status: 400 });
    }

    const result = await db.collection('access-code-questions').insertMany(newAssignments);

    return NextResponse.json({
      success: true,
      message: `Added ${result.insertedCount} new question assignments`,
      insertedCount: result.insertedCount,
      insertedIds: Object.values(result.insertedIds)
    });

  } catch (error) {
    console.error('Error in access-code-questions POST:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE /api/access-code-questions - Remove question assignments
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { generatedAccessCode, assignmentIds } = body;

    if (!generatedAccessCode || !assignmentIds || !Array.isArray(assignmentIds)) {
      return NextResponse.json({
        success: false,
        message: 'Generated access code and assignmentIds array are required'
      }, { status: 400 });
    }

    const db = await connectToDatabase();

    const result = await db.collection('access-code-questions').deleteMany({
      _id: { $in: assignmentIds.map(id => new ObjectId(id)) },
      generatedAccessCode
    });

    return NextResponse.json({
      success: true,
      message: `Removed ${result.deletedCount} question assignments`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error in access-code-questions DELETE:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
