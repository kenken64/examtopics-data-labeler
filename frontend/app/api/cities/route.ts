import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * GET /api/cities - Search Cities by State Name
 * 
 * Searches for cities in the database by state name with pagination and text search.
 * Returns cities that match the search query in their state_name field.
 * 
 * Query Parameters:
 * - search: Search term for state name (required)
 * - limit: Maximum number of results to return (default: 20, max: 100)
 * 
 * @param request - Authenticated HTTP request with search query
 * @returns JSON response with cities array or error message
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Establish database connection
    const db = await connectToDatabase();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limitParam = searchParams.get('limit');
    
    // Validate search parameter
    if (!search || search.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search term must be at least 2 characters long' },
        { status: 400 }
      );
    }
    
    // Parse and validate limit
    let limit = 20; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }
    
    // Create search query - case insensitive search on state_name
    const searchQuery = {
      state_name: {
        $regex: search.trim(),
        $options: 'i' // Case insensitive
      }
    };
    
    // Find cities with projection to return only needed fields
    const cities = await db.collection('cities')
      .find(searchQuery)
      .project({
        _id: 1,
        name: 1,
        state_name: 1,
        country_name: 1,
        state_code: 1,
        country_code: 1
      })
      .sort({ state_name: 1, name: 1 }) // Sort by state name then city name
      .limit(limit)
      .toArray();
    
    // Format response data
    const formattedCities = cities.map(city => ({
      id: city._id,
      name: city.name,
      stateName: city.state_name,
      countryName: city.country_name,
      stateCode: city.state_code,
      countryCode: city.country_code,
      displayName: `${city.name}, ${city.state_name}, ${city.country_name}`
    }));
    
    return NextResponse.json({
      cities: formattedCities,
      total: formattedCities.length,
      search: search.trim(),
      limit
    });
    
  } catch (error) {
    console.error('Error searching cities:', error);
    return NextResponse.json(
      { error: 'Failed to search cities' },
      { status: 500 }
    );
  }
});