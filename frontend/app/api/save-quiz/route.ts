// MongoDB client and database operations for quiz management
import { MongoClient, Db, ObjectId } from 'mongodb';
// Next.js server components for API route handling
import { NextRequest, NextResponse } from 'next/server';
// Authentication middleware and types for secure API access
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

// MongoDB connection string - loads from environment variables for security
const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/"; // Replace with your connection string
// MongoDB client instance for database operations
const client = new MongoClient(uri);

/**
 * Ensures all access codes for a certificate have complete question sets
 * This function maintains data integrity by verifying that every access code
 * has a corresponding record in access-code-questions for every question
 * 
 * @param {Db} db - MongoDB database instance
 * @param {string} certificateId - The certificate ID to check integrity for
 * 
 * Key Operations:
 * 1. Retrieves all questions for the specified certificate
 * 2. Finds all paid payees with generated access codes for this certificate
 * 3. For each access code, checks if all questions are properly linked
 * 4. Creates missing question assignments with proper ordering
 * 5. Maintains referential integrity between collections
 */
async function ensureCompleteAccessCodeQuestions(db: Db, certificateId: string) {
  try {
    // Log the start of integrity check for debugging and monitoring
    console.log(`Ensuring complete access code questions for certificate: ${certificateId}`);

    // Retrieve all questions for this certificate, ordered by question number
    // This ensures we process questions in the correct sequence
    const allQuestions = await db.collection('quizzes').find({
      certificateId: certificateId
    }).sort({ question_no: 1 }).toArray();

    // Early return if no questions exist - nothing to link
    if (allQuestions.length === 0) {
      console.log('No questions found for certificate:', certificateId);
      return;
    }

    // Find all payees who have completed payment and have generated access codes
    // Only paid users should have access to quiz questions
    const payeesWithAccessCodes = await db.collection('payees').find({
      certificateId: new ObjectId(certificateId), // Convert string to ObjectId for proper matching
      status: 'paid', // Only include users who have completed payment
      generatedAccessCode: { $exists: true, $ne: null } // Must have a valid access code
    }).toArray();

    // Early return if no access codes exist - nothing to check
    if (payeesWithAccessCodes.length === 0) {
      console.log('No payees with generated access codes found for certificate:', certificateId);
      return;
    }

    // Log summary of what we're processing for monitoring purposes
    console.log(`Found ${allQuestions.length} questions and ${payeesWithAccessCodes.length} access codes for certificate ${certificateId}`);

    // Process each access code to ensure complete question coverage
    // This is the main integrity check loop
    for (const payee of payeesWithAccessCodes) {
      const accessCode = payee.generatedAccessCode;

      // Retrieve all existing question assignments for this specific access code
      // This helps us identify what's already linked vs what's missing
      const existingAssignments = await db.collection('access-code-questions').find({
        generatedAccessCode: accessCode
      }).toArray();

      // Create a lookup set for fast O(1) checking of existing question links
      // Convert ObjectIds to strings for consistent comparison
      const existingQuestionIds = new Set(
        existingAssignments.map(assignment => assignment.questionId.toString())
      );

      // Filter to find questions that don't have assignments yet
      // These are the "missing links" we need to create
      const missingQuestions = allQuestions.filter(
        question => !existingQuestionIds.has(question._id.toString())
      );

      // Skip this access code if all questions are already properly linked
      if (missingQuestions.length === 0) {
        console.log(`Access code ${accessCode} already has all question assignments`);
        continue;
      }

      // Log missing assignments for debugging and monitoring
      console.log(`Access code ${accessCode} is missing ${missingQuestions.length} question assignments`);

      // Calculate proper ordering values for new assignments
      // This ensures new questions maintain proper sequence and don't conflict with existing ones
      
      // Find the highest sortOrder currently used for this access code
      // sortOrder determines the sequence in which questions are presented
      const maxSortResult = await db.collection('access-code-questions').aggregate([
        { $match: { generatedAccessCode: accessCode } }, // Filter to this access code only
        { $group: { _id: null, maxSort: { $max: '$sortOrder' } } } // Find maximum sortOrder value
      ]).toArray();

      // Find the highest assignedQuestionNo currently used for this access code
      // assignedQuestionNo is the question number shown to the user (may differ from original)
      const maxAssignedResult = await db.collection('access-code-questions').aggregate([
        { $match: { generatedAccessCode: accessCode } }, // Filter to this access code only
        { $group: { _id: null, maxAssigned: { $max: '$assignedQuestionNo' } } } // Find maximum assigned number
      ]).toArray();

      // Calculate next available sequence numbers
      // Start from 1 if no existing assignments, otherwise increment from max
      let nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;
      let nextAssignedQuestionNo = (maxAssignedResult[0]?.maxAssigned || 0) + 1;

      // Create assignment records for all missing questions
      // Each assignment links an access code to a specific question with metadata
      const missingAssignments = missingQuestions.map(question => ({
        generatedAccessCode: accessCode, // The access code this assignment belongs to
        payeeId: payee._id, // Reference to the user who owns this access code
        certificateId: new ObjectId(certificateId), // The certificate this question belongs to
        questionId: question._id, // Reference to the actual question
        originalQuestionNo: question.question_no, // Original question number from quiz collection
        assignedQuestionNo: nextAssignedQuestionNo++, // Sequential number for user presentation
        isEnabled: true, // Whether this question is active for the user
        assignedAt: new Date(), // Timestamp when assignment was created
        updatedAt: new Date(), // Timestamp for last modification
        sortOrder: nextSortOrder++ // Order for question presentation sequence
      }));

      // Bulk insert all missing assignments for efficiency
      // Only insert if we actually have missing assignments to avoid empty operations
      if (missingAssignments.length > 0) {
        await db.collection('access-code-questions').insertMany(missingAssignments);
        console.log(`Created ${missingAssignments.length} missing question assignments for access code ${accessCode}`);
      }
    }

    // Log completion of integrity check for monitoring
    console.log(`Completed access code questions integrity check for certificate ${certificateId}`);

  } catch (error) {
    // Log and re-throw errors for proper error handling upstream
    console.error('Error ensuring complete access code questions:', error);
    throw error;
  }
}

/**
 * Updates the access-code-questions collection when a new question is added to a certificate
 * This function is called after a new quiz question is saved to ensure that all existing
 * access codes for the certificate are immediately linked to the new question
 * 
 * @param {Db} db - MongoDB database instance
 * @param {string} certificateId - The certificate ID that the new question belongs to
 * @param {ObjectId} questionId - The MongoDB ObjectId of the newly created question
 * @param {number} questionNo - The question number assigned to the new question
 * 
 * Key Operations:
 * 1. Runs a full integrity check to ensure all existing questions are properly linked
 * 2. Specifically verifies the new question is linked to all access codes
 * 3. Creates any missing links with proper sequencing
 * 4. Maintains consistency across the access-code-questions collection
 */
async function updateAccessCodeQuestions(db: Db, certificateId: string, questionId: ObjectId, questionNo: number) {
  try {
    // Run comprehensive integrity check first
    // This ensures ALL questions (not just the new one) are properly linked to all access codes
    // It's better to be thorough than to have incomplete data
    await ensureCompleteAccessCodeQuestions(db, certificateId);

    // Additional verification step specifically for the new question
    // The integrity check above should handle this, but we add explicit verification
    // to ensure the new question is definitely linked properly
    
    // Retrieve all access codes that should have the new question
    const payeesWithAccessCodes = await db.collection('payees').find({
      certificateId: new ObjectId(certificateId), // Convert to ObjectId for proper matching
      status: 'paid', // Only paid users get access to questions
      generatedAccessCode: { $exists: true, $ne: null } // Must have valid access code
    }).toArray();

    // Early return if no access codes exist for this certificate
    if (payeesWithAccessCodes.length === 0) {
      console.log('No payees with generated access codes found for certificate:', certificateId);
      return;
    }

    // Track how many new assignments we create for reporting
    let addedCount = 0;
    
    // Verify each access code has the new question linked
    for (const payee of payeesWithAccessCodes) {
      // Check if this access code already has the new question assigned
      // This prevents duplicate assignments
      const existingLink = await db.collection('access-code-questions').findOne({
        generatedAccessCode: payee.generatedAccessCode,
        questionId: questionId
      });

      // If no existing link found, create one
      if (!existingLink) {
        console.log(`Creating missing link for new question ${questionNo} and access code ${payee.generatedAccessCode}`);
        
        // Calculate proper ordering values for the new assignment
        // We need to place this question at the end of the existing sequence
        
        // Get the current maximum sortOrder for this access code
        const maxSortResult = await db.collection('access-code-questions').aggregate([
          { $match: { generatedAccessCode: payee.generatedAccessCode } },
          { $group: { _id: null, maxSort: { $max: '$sortOrder' } } }
        ]).toArray();

        // Get the current maximum assignedQuestionNo for this access code
        const maxAssignedResult = await db.collection('access-code-questions').aggregate([
          { $match: { generatedAccessCode: payee.generatedAccessCode } },
          { $group: { _id: null, maxAssigned: { $max: '$assignedQuestionNo' } } }
        ]).toArray();

        // Calculate next available sequence numbers
        const nextSortOrder = (maxSortResult[0]?.maxSort || 0) + 1;
        const nextAssignedQuestionNo = (maxAssignedResult[0]?.maxAssigned || 0) + 1;

        // Create the new assignment record with all required fields
        const newAssignment = {
          generatedAccessCode: payee.generatedAccessCode, // Link to the access code
          payeeId: payee._id, // Reference to the user
          certificateId: new ObjectId(certificateId), // Certificate this belongs to
          questionId: questionId, // The new question being linked
          originalQuestionNo: questionNo, // Original question number from quiz
          assignedQuestionNo: nextAssignedQuestionNo, // Sequential number for user
          isEnabled: true, // Question is active and available
          assignedAt: new Date(), // When this assignment was created
          updatedAt: new Date(), // Last modification timestamp
          sortOrder: nextSortOrder // Position in the question sequence
        };

        // Insert the new assignment into the database
        await db.collection('access-code-questions').insertOne(newAssignment);
        addedCount++; // Track successful insertions
      }
    }

    // Log summary of what was accomplished
    console.log(`Access code questions update completed. Added ${addedCount} new assignments for question ${questionNo}`);

  } catch (error) {
    // Log and re-throw errors for proper error handling
    console.error('Error updating access-code-questions:', error);
    throw error;
  }
}

/**
 * HTTP POST endpoint for saving quiz questions
 * This is the main API route that handles quiz question submission and storage
 * It's protected by authentication middleware to ensure only authorized users can save questions
 * 
 * Request Flow:
 * 1. Authenticate the request using withAuth middleware
 * 2. Connect to MongoDB database
 * 3. Parse and validate incoming quiz data
 * 4. Calculate the next question number for proper sequencing
 * 5. Save the quiz with metadata (timestamps, question numbers)
 * 6. Update access-code-questions collection to maintain integrity
 * 7. Return success response with created question details
 * 
 * @param {AuthenticatedRequest} req - The authenticated HTTP request containing quiz data
 * @returns {NextResponse} JSON response with success/error status and question details
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    // Establish connection to MongoDB
    // Using the global client instance for connection pooling efficiency
    await client.connect();
    
    // Connect to the specific database and collection
    const db = client.db("awscert"); // Main application database
    const collection = db.collection("quizzes"); // Collection storing quiz questions

    // Parse the incoming JSON request body containing quiz question data
    // This includes question text, answers, explanations, certificate ID, etc.
    const quizData = await req.json();

    // Calculate the next sequential question number for this certificate
    // This ensures questions are properly numbered and ordered within each certificate
    const lastQuiz = await collection
      .findOne(
        { certificateId: quizData.certificateId }, // Find questions for this certificate only
        { sort: { question_no: -1 } } // Sort by question number descending to get the highest
      );

    // Determine the next question number
    // Start from 1 if this is the first question, otherwise increment from the last number
    const nextQuestionNo = lastQuiz ? (lastQuiz.question_no || 0) + 1 : 1;

    // Enhance the quiz data with system-generated metadata
    // This adds essential tracking information to the question record
    const quizWithMetadata = {
      ...quizData, // Spread the original quiz data (question, answers, etc.)
      question_no: nextQuestionNo, // Add sequential question number
      userId: req.user.userId, // Add user ID for RBAC filtering
      createdAt: new Date(), // Add creation timestamp for auditing
    };

    // Insert the new quiz question into the database
    // This returns the insertion result including the new document's ID
    const result = await collection.insertOne(quizWithMetadata);

    // Automatically update the access-code-questions collection
    // This ensures that all existing access codes for this certificate
    // immediately have access to the new question without manual intervention
    try {
      await updateAccessCodeQuestions(db, quizData.certificateId, result.insertedId, nextQuestionNo);
    } catch (updateError) {
      // Log warning but don't fail the main operation
      // The quiz is saved successfully even if access code updates fail
      // This prevents data loss while highlighting integrity issues
      console.warn('Failed to update access-code-questions collection:', updateError);
      // Note: Main quiz save operation continues regardless of this failure
    }

    // Return success response with created question details
    // This provides the client with confirmation and the new question's metadata
    return NextResponse.json({ 
      message: "Quiz saved successfully", 
      id: result.insertedId, // MongoDB ObjectId of the new question
      questionNo: nextQuestionNo // The assigned question number for reference
    }, { status: 201 }); // 201 Created status code for successful resource creation
    
  } catch (error) {
    // Log the error for debugging and monitoring purposes
    console.error("Failed to save quiz", error);
    
    // Return error response to the client
    // Don't expose internal error details for security reasons
    return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
    
  } finally {
    // Always close the database connection to prevent connection leaks
    // This runs regardless of success or failure of the operation
    await client.close();
  }
});
