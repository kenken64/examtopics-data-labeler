import { MongoClient, Db, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/"; // Replace with your connection string
const client = new MongoClient(uri);

/**
 * Updates the access-code-questions collection when a new question is added to a certificate
 * This ensures that all generated access codes for this certificate include the new question
 */
async function updateAccessCodeQuestions(db: Db, certificateId: string, questionId: ObjectId, questionNo: number) {
  try {
    // Find all payees with generated access codes for this certificate
    const payeesWithAccessCodes = await db.collection('payees').find({
      certificateId: new ObjectId(certificateId),
      status: 'paid',
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();

    if (payeesWithAccessCodes.length === 0) {
      console.log('No payees with generated access codes found for certificate:', certificateId);
      return;
    }

    console.log(`Found ${payeesWithAccessCodes.length} payees with generated access codes for certificate ${certificateId}`);

    // For each payee, add the new question to their access-code-questions
    const insertPromises = payeesWithAccessCodes.map(async (payee) => {
      // Get the current max sort order for this access code
      const maxSortResult = await db.collection('access-code-questions').aggregate([
        { $match: { generatedAccessCode: payee.generatedAccessCode } },
        { $group: { _id: null, maxSort: { $max: '$sortOrder' } } }
      ]).toArray();

      const nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;

      // Get the current max assigned question number for this access code
      const maxAssignedResult = await db.collection('access-code-questions').aggregate([
        { $match: { generatedAccessCode: payee.generatedAccessCode } },
        { $group: { _id: null, maxAssigned: { $max: '$assignedQuestionNo' } } }
      ]).toArray();

      const nextAssignedQuestionNo = (maxAssignedResult[0]?.maxAssigned || 0) + 1;

      // Create the new access code question assignment
      const newAssignment = {
        generatedAccessCode: payee.generatedAccessCode,
        payeeId: payee._id,
        certificateId: new ObjectId(certificateId),
        questionId: questionId,
        originalQuestionNo: questionNo,
        assignedQuestionNo: nextAssignedQuestionNo,
        isEnabled: true, // New questions are enabled by default
        assignedAt: new Date(),
        updatedAt: new Date(),
        sortOrder: nextSortOrder
      };

      // Insert the new assignment
      return db.collection('access-code-questions').insertOne(newAssignment);
    });

    const results = await Promise.all(insertPromises);
    console.log(`Successfully added ${results.length} new question assignments for question ${questionNo}`);

  } catch (error) {
    console.error('Error updating access-code-questions:', error);
    throw error;
  }
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await client.connect();
    const db = client.db("awscert");
    const collection = db.collection("quizzes");

    const quizData = await req.json();

    // Find the highest question_no for the given certificateId
    const lastQuiz = await collection
      .findOne(
        { certificateId: quizData.certificateId },
        { sort: { question_no: -1 } }
      );

    // Calculate the next question number
    const nextQuestionNo = lastQuiz ? (lastQuiz.question_no || 0) + 1 : 1;

    // Add question_no and timestamp to the quiz data
    const quizWithMetadata = {
      ...quizData,
      question_no: nextQuestionNo,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(quizWithMetadata);

    // Auto-update access-code-questions collection for any generated access codes
    // linked to this certificate
    try {
      await updateAccessCodeQuestions(db, quizData.certificateId, result.insertedId, nextQuestionNo);
    } catch (updateError) {
      console.warn('Failed to update access-code-questions collection:', updateError);
      // Don't fail the main quiz save operation if this fails
    }

    return NextResponse.json({ 
      message: "Quiz saved successfully", 
      id: result.insertedId,
      questionNo: nextQuestionNo
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to save quiz", error);
    return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
  } finally {
    await client.close();
  }
});
