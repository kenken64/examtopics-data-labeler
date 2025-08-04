import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/role-filter';

interface RouteParams {
  params: { id: string };
}

export const PATCH = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    // Only admin users can update AI agent status
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'training'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, inactive, training' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection('ai_agents');

    // Check if agent exists
    const existingAgent = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingAgent) {
      return NextResponse.json(
        { error: 'AI agent not found' },
        { status: 404 }
      );
    }

    // Update the AI agent status
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'AI agent not found' },
        { status: 404 }
      );
    }

    console.log(`🔄 AI Agent status updated: ${existingAgent.name} -> ${status} by ${request.user?.email}`);

    // Return the updated agent
    const updatedAgent = await collection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      message: `AI agent status updated to ${status}`,
      agent: updatedAgent
    });

  } catch (error) {
    console.error('❌ Error updating AI agent status:', error);
    return NextResponse.json(
      { error: 'Failed to update AI agent status' },
      { status: 500 }
    );
  }
});
