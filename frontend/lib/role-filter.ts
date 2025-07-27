import { AuthenticatedRequest } from './auth';

/**
 * Builds a MongoDB filter object based on user role
 * - Admin users: can see all data (no filter)
 * - Regular users: can only see their own data (filtered by userId)
 */
export function buildUserFilter(request: AuthenticatedRequest) {
  const filter: any = {};
  
  // If user is not admin, filter by their userId
  if (request.user.role !== 'admin') {
    filter.userId = request.user.userId;
  }
  
  return filter;
}

/**
 * Checks if a user can access data belonging to a specific user
 * @param request - The authenticated request
 * @param targetUserId - The userId of the data owner
 * @returns true if access is allowed, false otherwise
 */
export function canAccessUserData(request: AuthenticatedRequest, targetUserId: string): boolean {
  // Admin can access any user's data
  if (request.user.role === 'admin') {
    return true;
  }
  
  // Regular users can only access their own data
  return request.user.userId === targetUserId;
}

/**
 * Checks if a user has admin privileges
 * @param request - The authenticated request
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(request: AuthenticatedRequest): boolean {
  return request.user.role === 'admin';
}

/**
 * Middleware to require admin role
 * @param request - The authenticated request
 * @throws Error if user is not admin
 */
export function requireAdmin(request: AuthenticatedRequest): void {
  if (!isAdmin(request)) {
    throw new Error('Admin access required');
  }
}
