import { MongoClient } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/"; // Replace with your connection string
const client = new MongoClient(uri);

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
