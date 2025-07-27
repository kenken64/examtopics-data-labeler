import { MongoClient, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { buildUserFilter, isAdmin } from '@/lib/role-filter';

const uri = process.env.MONGODB_URI || "mongodb+srv://user:password@cluster.mongodb.net/";
const client = new MongoClient(uri);

/**
 * GET /api/quizzes - Retrieve quizzes with role-based access control
 * 
 * Query Parameters:
 * - page: Page number for pagination (default: 1)
 * - limit: Number of results per page (default: 10)
 * - certificateId: Filter by certificate ID (optional)
 * 
 * RBAC Logic:
 * - Admin users: Can see all quizzes in the system
 * - Regular users: Can only see quizzes they created (userId filter)
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await client.connect();
    const db = client.db("awscert");
    const collection = db.collection("quizzes");

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const certificateId = searchParams.get('certificateId');
    
    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build user filter for RBAC
    const userFilter = buildUserFilter(req);
    
    // Build query filter
    let queryFilter: any = { ...userFilter };
    
    // Add certificate filter if specified
    if (certificateId) {
      queryFilter.certificateId = certificateId;
    }

    // Get total count for pagination
    const totalCount = await collection.countDocuments(queryFilter);
    
    // Fetch quizzes with pagination and sorting
    const quizzes = await collection
      .find(queryFilter)
      .sort({ createdAt: -1, question_no: -1 }) // Most recent first, then by question number
      .skip(skip)
      .limit(limit)
      .toArray();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Prepare response with enhanced format
    const response = {
      quizzes,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      },
      userInfo: {
        userId: req.user.userId,
        isAdmin: isAdmin(req),
        email: req.user.email
      },
      filterApplied: isAdmin(req) ? 'Admin: All quizzes visible' : 'User: Own quizzes only'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Failed to fetch quizzes:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  } finally {
    await client.close();
  }
});
