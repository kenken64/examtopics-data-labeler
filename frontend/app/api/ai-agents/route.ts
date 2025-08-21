import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { buildUserFilter, isAdmin } from '@/lib/role-filter';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    console.log(`🤖 AI Agents GET: User ${request.user?.email} (${request.user?.role}) fetching AI agents`);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const skip = (page - 1) * limit;

    const db = await connectToDatabase();
    const collection = db.collection('ai_agents');

    // Build role-based filter
    const userFilter = buildUserFilter(request);
    
    // Build search query with role-based filtering
    const searchQuery = {
      ...userFilter, // Apply role-based filtering
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
          { capabilities: { $in: [new RegExp(search, 'i')] } }
        ]
      }),
      ...(status && { status }),
      ...(type && { type })
    };

    console.log('🔒 Applied filter:', JSON.stringify(searchQuery));

    // Get total count for pagination
    const totalAgents = await collection.countDocuments(searchQuery);

    // Get AI agents with pagination
    const agents = await collection
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      agents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalAgents / limit),
        totalAgents,
        hasNextPage: page < Math.ceil(totalAgents / limit),
        hasPreviousPage: page > 1,
        limit
      },
      userInfo: {
        email: request.user?.email,
        role: request.user?.role,
        isAdmin: isAdmin(request)
      },
      filterApplied: search
    });

  } catch (error) {
    console.error('❌ Error fetching AI agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI agents' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Only admin users can create AI agents
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
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

    // Check if agent with this name already exists
    const existingAgent = await collection.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingAgent) {
      return NextResponse.json(
        { error: 'An AI agent with this name already exists' },
        { status: 409 }
      );
    }

    // Create the new AI agent
    const newAgent = {
      name: name.trim(),
      description: description.trim(),
      type,
      status: 'inactive', // New agents start as inactive
      capabilities: Array.isArray(capabilities) ? capabilities.filter(c => c.trim()) : [],
      model,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: request.user?.email || 'unknown'
    };

    const result = await collection.insertOne(newAgent);

    console.log(`✅ AI Agent created: ${name} by ${request.user?.email}`);

    return NextResponse.json({
      message: 'AI agent created successfully',
      agentId: result.insertedId,
      agent: { ...newAgent, _id: result.insertedId }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to create AI agent' },
      { status: 500 }
    );
  }
});
