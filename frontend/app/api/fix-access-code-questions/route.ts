import { MongoClient, Db, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/";
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
      return {
        certificateId,
        questionsFound: 0,
        accessCodesFound: 0,
        recordsCreated: 0,
        message: 'No questions found for certificate'
      };
    }

    // Find all payees with generated access codes for this certificate
    const payeesWithAccessCodes = await db.collection('payees').find({
      certificateId: new ObjectId(certificateId),
      status: 'paid',
      generatedAccessCode: { $exists: true, $ne: null }
    }).toArray();

    if (payeesWithAccessCodes.length === 0) {
      return {
        certificateId,
        questionsFound: allQuestions.length,
        accessCodesFound: 0,
        recordsCreated: 0,
        message: 'No payees with generated access codes found for certificate'
      };
    }

    console.log(`Found ${allQuestions.length} questions and ${payeesWithAccessCodes.length} access codes for certificate ${certificateId}`);

    let totalRecordsCreated = 0;
    const accessCodeResults = [];

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

      let recordsCreatedForAccessCode = 0;

      if (missingQuestions.length > 0) {
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
          recordsCreatedForAccessCode = missingAssignments.length;
          totalRecordsCreated += recordsCreatedForAccessCode;
          console.log(`Created ${missingAssignments.length} missing question assignments for access code ${accessCode}`);
        }
      }

      accessCodeResults.push({
        accessCode,
        existingRecords: existingAssignments.length,
        missingRecords: missingQuestions.length,
        recordsCreated: recordsCreatedForAccessCode
      });
    }

    return {
      certificateId,
      questionsFound: allQuestions.length,
      accessCodesFound: payeesWithAccessCodes.length,
      recordsCreated: totalRecordsCreated,
      accessCodeDetails: accessCodeResults,
      message: totalRecordsCreated > 0 
        ? `Successfully created ${totalRecordsCreated} missing question assignments`
        : 'All access codes already have complete question sets'
    };

  } catch (error) {
    console.error('Error ensuring complete access code questions:', error);
    throw error;
  }
}

/**
 * API endpoint to fix missing access-code-questions records
 * Can be called for a specific certificate or all certificates
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await client.connect();
    const db = client.db("awscert");

    const body = await req.json();
    const { certificateId, fixAll } = body;

    if (!certificateId && !fixAll) {
      return NextResponse.json({ 
        error: "Either certificateId or fixAll=true must be provided" 
      }, { status: 400 });
    }

    let results = [];

    if (certificateId) {
      // Fix specific certificate
      const result = await ensureCompleteAccessCodeQuestions(db, certificateId);
      results.push(result);
    } else if (fixAll) {
      // Fix all certificates that have questions
      const certificates = await db.collection('quizzes').aggregate([
        { $group: { _id: "$certificateId" } },
        { $project: { certificateId: "$_id" } }
      ]).toArray();

      console.log(`Found ${certificates.length} certificates with questions`);

      for (const cert of certificates) {
        const result = await ensureCompleteAccessCodeQuestions(db, cert.certificateId);
        results.push(result);
      }
    }

    const totalRecordsCreated = results.reduce((sum, result) => sum + result.recordsCreated, 0);

    return NextResponse.json({ 
      success: true,
      totalCertificatesProcessed: results.length,
      totalRecordsCreated,
      results
    }, { status: 200 });

  } catch (error) {
    console.error("Failed to fix access code questions", error);
    return NextResponse.json({ 
      error: "Failed to fix access code questions",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
});

/**
 * GET endpoint to check the status of access-code-questions integrity
 * Shows statistics about missing records without fixing them
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await client.connect();
    const db = client.db("awscert");

    const url = new URL(req.url);
    const certificateId = url.searchParams.get('certificateId');

    let certificates = [];

    if (certificateId) {
      certificates = [{ certificateId }];
    } else {
      // Get all certificates that have questions
      const certs = await db.collection('quizzes').aggregate([
        { $group: { _id: "$certificateId" } },
        { $project: { certificateId: "$_id" } }
      ]).toArray();
      certificates = certs.map(cert => ({ certificateId: cert.certificateId }));
    }

    const results = [];

    for (const cert of certificates) {
      const certId = cert.certificateId;

      // Get question count for this certificate
      const questionCount = await db.collection('quizzes').countDocuments({
        certificateId: certId
      });

      if (questionCount === 0) continue;

      // Get access codes for this certificate
      const payeesWithAccessCodes = await db.collection('payees').find({
        certificateId: new ObjectId(certId),
        status: 'paid',
        generatedAccessCode: { $exists: true, $ne: null }
      }).toArray();

      const accessCodeDetails = [];
      let totalMissingRecords = 0;

      for (const payee of payeesWithAccessCodes) {
        const accessCode = payee.generatedAccessCode;
        
        // Count existing records for this access code
        const existingCount = await db.collection('access-code-questions').countDocuments({
          generatedAccessCode: accessCode
        });

        const missingCount = Math.max(0, questionCount - existingCount);
        totalMissingRecords += missingCount;

        accessCodeDetails.push({
          accessCode,
          expectedRecords: questionCount,
          existingRecords: existingCount,
          missingRecords: missingCount,
          isComplete: missingCount === 0
        });
      }

      results.push({
        certificateId: certId,
        questionCount,
        accessCodeCount: payeesWithAccessCodes.length,
        totalMissingRecords,
        accessCodeDetails,
        needsFix: totalMissingRecords > 0
      });
    }

    const totalMissing = results.reduce((sum, result) => sum + result.totalMissingRecords, 0);

    return NextResponse.json({
      success: true,
      totalCertificatesChecked: results.length,
      totalMissingRecords: totalMissing,
      needsFix: totalMissing > 0,
      results
    }, { status: 200 });

  } catch (error) {
    console.error("Failed to check access code questions status", error);
    return NextResponse.json({ 
      error: "Failed to check access code questions status",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
});
