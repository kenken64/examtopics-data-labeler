import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/role-filter';

interface RouteParams {
  params: { id: string };
}

export const GET = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection('ai_agents');

    const agent = await collection.findOne({ _id: new ObjectId(id) });

    if (!agent) {
      return NextResponse.json(
        { error: 'AI agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);

  } catch (error) {
    console.error('❌ Error fetching AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI agent' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    // Only admin users can update AI agents
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, type, capabilities, model } = body;

    // Validate required fields
    if (!name || !description || !type || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, type, and model are required' },
        { status: 400 }
      );
    }

    // Validate agent type
    const validTypes = ['chatbot', 'assistant', 'analyzer', 'generator'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid agent type. Must be one of: chatbot, assistant, analyzer, generator' },
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

    // Check if another agent with the same name exists (excluding current agent)
    const duplicateAgent = await collection.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: new ObjectId(id) }
    });
    
    if (duplicateAgent) {
      return NextResponse.json(
        { error: 'An AI agent with this name already exists' },
        { status: 409 }
      );
    }

    // Update the AI agent
    const updateData = {
      name: name.trim(),
      description: description.trim(),
      type,
      capabilities: Array.isArray(capabilities) ? capabilities.filter(c => c.trim()) : [],
      model,
      updatedAt: new Date()
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'AI agent not found' },
        { status: 404 }
      );
    }

    console.log(`✅ AI Agent updated: ${name} by ${request.user?.email}`);

    // Return the updated agent
    const updatedAgent = await collection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      message: 'AI agent updated successfully',
      agent: updatedAgent
    });

  } catch (error) {
    console.error('❌ Error updating AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to update AI agent' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    // Only admin users can delete AI agents
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
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

    // Delete the AI agent
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'AI agent not found' },
        { status: 404 }
      );
    }

    console.log(`🗑️ AI Agent deleted: ${existingAgent.name} by ${request.user?.email}`);

    return NextResponse.json({
      message: 'AI agent deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI agent' },
      { status: 500 }
    );
  }
});
