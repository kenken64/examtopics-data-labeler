import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { buildUserFilter, isAdmin } from '@/lib/role-filter';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    console.log(`🏢 Companies GET: User ${request.user?.email} (${request.user?.role}) fetching companies`);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const db = await connectToDatabase();
    const collection = db.collection('companies');

    // Build role-based filter
    const userFilter = buildUserFilter(request);
    
    // Build search query with role-based filtering
    const searchQuery = {
      ...userFilter, // Apply role-based filtering
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ]
      })
    };

    console.log('🔒 Applied filter:', JSON.stringify(searchQuery));

    // Get total count for pagination
    const totalCompanies = await collection.countDocuments(searchQuery);

    // Get companies with pagination
    const companies = await collection
      .find(searchQuery)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      companies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCompanies / limit),
        totalCompanies,
        hasNextPage: skip + limit < totalCompanies,
        hasPreviousPage: page > 1,
        limit
      },
      userInfo: {
        email: request.user.email,
        role: request.user.role,
        isAdmin: isAdmin(request)
      },
      filterApplied: isAdmin(request) ? 'All companies (admin)' : 'User companies only'
    });

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { name, code } = body;
    
    console.log(`🏢 Companies POST: User ${request.user?.username} creating company: ${name} (${code})`);

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Company name and code are required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection('companies');

    // Check if company code already exists
    const existingCompany = await collection.findOne({ code });
    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company code already exists' },
        { status: 409 }
      );
    }

    // Create new company with role-based ownership
    const newCompany = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      createdBy: request.user?.userId,
      createdByUsername: request.user?.username,
      userId: request.user?.userId, // Add userId for role-based filtering
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newCompany);

    return NextResponse.json({
      message: 'Company created successfully',
      company: { _id: result.insertedId, ...newCompany }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    const { _id, name, code } = body;
    
    console.log(`🏢 Companies PUT: User ${request.user?.email} (${request.user?.role}) updating company: ${_id}`);

    if (!_id || !name || !code) {
      return NextResponse.json(
        { error: 'Company ID, name, and code are required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection('companies');

    // Build role-based filter for finding the company to update
    const userFilter = buildUserFilter(request);
    const findFilter = {
      _id: new ObjectId(_id),
      ...userFilter // Apply role-based filtering
    };

    // Check if user can access this company
    const existingCompany = await collection.findOne(findFilter);
    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 404 }
      );
    }

    // Check if company code already exists for a different company
    const duplicateCompany = await collection.findOne({ 
      code, 
      _id: { $ne: new ObjectId(_id) }
    });
    
    if (duplicateCompany) {
      return NextResponse.json(
        { error: 'Company code already exists' },
        { status: 409 }
      );
    }

    // Update company
    const updateData = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      updatedBy: request.user?.userId,
      updatedByUsername: request.user?.username,
      updatedAt: new Date()
    };

    // Update company with role-based filtering
    const result = await collection.updateOne(
      findFilter, // Use role-based filter
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Company updated successfully'
    });

  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log(`🏢 Companies DELETE: User ${request.user?.email} (${request.user?.role}) deleting company: ${id}`);

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection('companies');

    // Build role-based filter for deletion
    const userFilter = buildUserFilter(request);
    const deleteFilter = {
      _id: new ObjectId(id),
      ...userFilter // Apply role-based filtering
    };

    const result = await collection.deleteOne(deleteFilter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
});