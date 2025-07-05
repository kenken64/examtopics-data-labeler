import { MongoClient } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/";
const client = new MongoClient(uri);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await client.connect();
    const db = client.db("awscert");
    const collection = db.collection("quizzes");

    const certificateId = params.id;

    // Find the highest question_no for the given certificateId
    const lastQuiz = await collection
      .findOne(
        { certificateId },
        { sort: { question_no: -1 } }
      );

    // Calculate the next question number
    const nextQuestionNo = lastQuiz ? (lastQuiz.question_no || 0) + 1 : 1;

    return NextResponse.json({ nextQuestionNo }, { status: 200 });
  } catch (error) {
    console.error("Failed to get next question number", error);
    return NextResponse.json({ error: "Failed to get next question number" }, { status: 500 });
  } finally {
    await client.close();
  }
}
