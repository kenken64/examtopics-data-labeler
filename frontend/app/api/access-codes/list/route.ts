import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { buildAccessCodeFilter, getAccessCodeOwnershipInfo } from '@/lib/access-code-rbac';

/**
 * GET /api/access-codes/list - List access codes with collaborative RBAC
 * 
 * Returns access codes based on payee ownership:
 * - Admin users: Can see all access codes
 * - Regular users: Can see access codes for payees they own
 * 
 * Features:
 * - Shows both payee owner and question linker information
 * - Indicates link status and collaboration history
 * - Supports pagination and filtering
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const certificateFilter = searchParams.get('certificateId');
    const skip = (page - 1) * limit;

    const db = await connectToDatabase();
    
    // Build filter based on payee ownership
    const baseFilter = buildAccessCodeFilter(request);
    
    // Add certificate filter if specified
    let matchFilter: any = { status: 'paid', ...baseFilter };
    if (certificateFilter) {
      matchFilter.certificateId = certificateFilter;
    }

    // Enhanced aggregation to get access codes with collaborative info
    const accessCodesAggregation = [
      {
        $match: matchFilter
      },
      // Get payee owner information
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'payeeOwner'
        }
      },
      {
        $unwind: { path: '$payeeOwner', preserveNullAndEmptyArrays: true }
      },
      // Get certificate information
      {
        $lookup: {
          from: 'certificates',
          localField: 'certificateId',
          foreignField: '_id',
          as: 'certificate'
        }
      },
      {
        $unwind: { path: '$certificate', preserveNullAndEmptyArrays: true }
      },
      // Get question assignments for this access code
      {
        $lookup: {
          from: 'access-code-questions',
          localField: 'generatedAccessCode',
          foreignField: 'generatedAccessCode',
          as: 'questionAssignments'
        }
      },
      // Calculate collaboration stats
      {
        $addFields: {
          totalQuestions: { $size: '$questionAssignments' },
          hasQuestions: { $gt: [{ $size: '$questionAssignments' }, 0] },
          // Get unique contributors to question management
          contributors: {
            $reduce: {
              input: '$questionAssignments',
              initialValue: [],
              in: {
                $cond: {
                  if: { $in: ['$$this.userId', '$$value'] },
                  then: '$$value',
                  else: { $concatArrays: ['$$value', ['$$this.userId']] }
                }
              }
            }
          },
          lastQuestionUpdate: { $max: '$questionAssignments.updatedAt' }
        }
      },
      // Get contributor information
      {
        $lookup: {
          from: 'users',
          localField: 'contributors',
          foreignField: '_id',
          as: 'contributorDetails'
        }
      },
      // Project final structure
      {
        $project: {
          accessCode: '$generatedAccessCode',
          customerName: '$payeeName',
          amount: 1,
          status: 1,
          createdAt: 1,
          payeeOwnerId: '$userId',
          payeeOwner: {
            username: '$payeeOwner.username',
            email: '$payeeOwner.email',
            role: '$payeeOwner.role'
          },
          certificate: {
            _id: '$certificate._id',
            name: '$certificate.name',
            code: '$certificate.code'
          },
          questionStats: {
            totalQuestions: '$totalQuestions',
            hasQuestions: '$hasQuestions',
            lastUpdate: '$lastQuestionUpdate'
          },
          contributors: {
            $map: {
              input: '$contributorDetails',
              as: 'contributor',
              in: {
                userId: '$$contributor._id',
                username: '$$contributor.username',
                role: '$$contributor.role'
              }
            }
          },
          linkStatus: {
            $cond: {
              if: '$hasQuestions',
              then: 'Linked',
              else: 'Not Linked'
            }
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const accessCodes = await db.collection('payees').aggregate(accessCodesAggregation).toArray();
    
    // Get total count with the same filter
    const totalCountResult = await db.collection('payees').aggregate([
      { $match: matchFilter },
      { $count: 'total' }
    ]).toArray();
    
    const totalCount = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Determine filter description
    const userInfo = getAccessCodeOwnershipInfo(request);
    const filterDescription = userInfo.isAdmin 
      ? 'Admin: All access codes visible' 
      : 'User: Own access codes only';

    console.log(`🔒 Access Codes List - User: ${userInfo.email} (${userInfo.role})`);
    console.log(`📋 Filter applied: ${JSON.stringify(baseFilter)}`);
    console.log(`📊 Results: ${accessCodes.length}/${totalCount} access codes`);

    return NextResponse.json({
      success: true,
      accessCodes,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      userInfo,
      filterApplied: filterDescription
    });

  } catch (error) {
    console.error('Error fetching access codes list:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch access codes'
    }, { status: 500 });
  }
});