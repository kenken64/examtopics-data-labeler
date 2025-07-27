import { AuthenticatedRequest } from './auth';
import { ObjectId } from 'mongodb';

/**
 * Access Code RBAC Utilities
 * 
 * Handles collaborative access code management where:
 * - Users own payees and their generated access codes
 * - Both admin and payee owner can manage questions for access codes
 * - Proper permission checking for viewing vs modifying
 */

export function buildAccessCodeFilter(request: AuthenticatedRequest) {
  // Admin can see all access codes
  if (request.user.role === 'admin') {
    return {};
  }
  
  // Regular users can see access codes where they own the payee
  return { userId: new ObjectId(request.user.userId) };
}

export function canAccessAccessCode(request: AuthenticatedRequest, payeeUserId: string): boolean {
  // Admin can access any access code
  if (request.user.role === 'admin') {
    return true;
  }
  
  // Users can access access codes for payees they own
  return request.user.userId === payeeUserId.toString();
}

export function canModifyAccessCodeQuestions(request: AuthenticatedRequest, payeeUserId: string): boolean {
  // 🚀 ENHANCED: Both admin and payee owner can modify questions
  
  // Admin can modify any access code questions
  if (request.user.role === 'admin') {
    return true;
  }
  
  // Users can modify questions for access codes where they own the payee
  return request.user.userId === payeeUserId.toString();
}

export function getQuestionManagementPermissions(request: AuthenticatedRequest, payeeUserId: string) {
  const canView = canAccessAccessCode(request, payeeUserId);
  const canModify = canModifyAccessCodeQuestions(request, payeeUserId);
  
  return {
    canView,
    canModify,
    accessReason: request.user.role === 'admin' 
      ? 'Admin privileges' 
      : request.user.userId === payeeUserId.toString()
        ? 'Payee owner'
        : 'No access'
  };
}

export function getAccessCodeOwnershipInfo(request: AuthenticatedRequest) {
  return {
    userId: request.user.userId,
    email: request.user.email,
    role: request.user.role,
    isAdmin: request.user.role === 'admin'
  };
}
