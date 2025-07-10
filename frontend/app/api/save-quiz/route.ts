import { MongoClient, Db, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/"; // Replace with your connection string
const client = new MongoClient(uri);

/**
 * Ensures all access codes for a certificate have complete question sets
 * Finds missing question links and creates them to guarantee data integrity
 */
async function ensureCompleteAccessCodeQuestions(db: Db, certificateId: string) {
  try {
    console.log(`Ensuring complete access code questions for certificate: ${certificateId}`);

    // Get all questions for this certificate
    const allQuestions = await db.collection('quizzes').find({
      certificateId: certificateId
    }).sort({ question_no: 1 }).toArray();

    if (allQuestions.length === 0) {
      console.log('No questions found for certificate:', certificateId);
      return;
    }

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

    console.log(`Found ${allQuestions.length} questions and ${payeesWithAccessCodes.length} access codes for certificate ${certificateId}`);

    // For each access code, ensure all questions are linked
    for (const payee of payeesWithAccessCodes) {
      const accessCode = payee.generatedAccessCode;

      // Get existing question assignments for this access code
      const existingAssignments = await db.collection('access-code-questions').find({
        generatedAccessCode: accessCode
      }).toArray();

      // Create a map of existing question IDs for quick lookup
      const existingQuestionIds = new Set(
        existingAssignments.map(assignment => assignment.questionId.toString())
      );

      // Find questions that are missing assignments
      const missingQuestions = allQuestions.filter(
        question => !existingQuestionIds.has(question._id.toString())
      );

      if (missingQuestions.length === 0) {
        console.log(`Access code ${accessCode} already has all question assignments`);
        continue;
      }

      console.log(`Access code ${accessCode} is missing ${missingQuestions.length} question assignments`);

      // Get current max values for proper ordering
      const maxSortResult = await db.collection('access-code-questions').aggregate([
        { $match: { generatedAccessCode: accessCode } },
        { $group: { _id: null, maxSort: { $max: '$sortOrder' } } }
      ]).toArray();

      const maxAssignedResult = await db.collection('access-code-questions').aggregate([
        { $match: { generatedAccessCode: accessCode } },
        { $group: { _id: null, maxAssigned: { $max: '$assignedQuestionNo' } } }
      ]).toArray();

      let nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;
      let nextAssignedQuestionNo = (maxAssignedResult[0]?.maxAssigned || 0) + 1;

      // Create missing assignments
      const missingAssignments = missingQuestions.map(question => ({
        generatedAccessCode: accessCode,
        payeeId: payee._id,
        certificateId: new ObjectId(certificateId),
        questionId: question._id,
        originalQuestionNo: question.question_no,
        assignedQuestionNo: nextAssignedQuestionNo++,
        isEnabled: true,
        assignedAt: new Date(),
        updatedAt: new Date(),
        sortOrder: nextSortOrder++
      }));

      if (missingAssignments.length > 0) {
        await db.collection('access-code-questions').insertMany(missingAssignments);
        console.log(`Created ${missingAssignments.length} missing question assignments for access code ${accessCode}`);
      }
    }

    console.log(`Completed access code questions integrity check for certificate ${certificateId}`);

  } catch (error) {
    console.error('Error ensuring complete access code questions:', error);
    throw error;
  }
}

/**
 * Updates the access-code-questions collection when a new question is added to a certificate
 * This ensures that all generated access codes for this certificate include the new question
 */
async function updateAccessCodeQuestions(db: Db, certificateId: string, questionId: ObjectId, questionNo: number) {
  try {
    // First ensure all existing questions are properly linked (integrity check)
    await ensureCompleteAccessCodeQuestions(db, certificateId);

    // The new question should already be linked by the integrity check above,
    // but we'll add a specific check to ensure it's properly added
    const payeesWithAccessCodes = await db.collection('payees').find({
      certificateId: new ObjectId(certificateId),
      status: 'paid',
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();

    if (payeesWithAccessCodes.length === 0) {
      console.log('No payees with generated access codes found for certificate:', certificateId);
      return;
    }

    // Verify that the new question is linked for all access codes
    let addedCount = 0;
    for (const payee of payeesWithAccessCodes) {
      const existingLink = await db.collection('access-code-questions').findOne({
        generatedAccessCode: payee.generatedAccessCode,
        questionId: questionId
      });

      if (!existingLink) {
        console.log(`Creating missing link for new question ${questionNo} and access code ${payee.generatedAccessCode}`);
        
        // Get proper ordering values
        const maxSortResult = await db.collection('access-code-questions').aggregate([
          { $match: { generatedAccessCode: payee.generatedAccessCode } },
          { $group: { _id: null, maxSort: { $max: '$sortOrder' } } }
        ]).toArray();

        const maxAssignedResult = await db.collection('access-code-questions').aggregate([
          { $match: { generatedAccessCode: payee.generatedAccessCode } },
          { $group: { _id: null, maxAssigned: { $max: '$assignedQuestionNo' } } }
        ]).toArray();

        const nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;
        const nextAssignedQuestionNo = (maxAssignedResult[0]?.maxAssigned || 0) + 1;

        const newAssignment = {
          generatedAccessCode: payee.generatedAccessCode,
          payeeId: payee._id,
          certificateId: new ObjectId(certificateId),
          questionId: questionId,
          originalQuestionNo: questionNo,
          assignedQuestionNo: nextAssignedQuestionNo,
          isEnabled: true,
          assignedAt: new Date(),
          updatedAt: new Date(),
          sortOrder: nextSortOrder
        };

        await db.collection('access-code-questions').insertOne(newAssignment);
        addedCount++;
      }
    }

    console.log(`Access code questions update completed. Added ${addedCount} new assignments for question ${questionNo}`);

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
