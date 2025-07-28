# Role-Based Access Control Implementation

## Overview
Implemented role-based access control for the payee management system where:
- **Regular users** can only see and manage their own payees
- **Admin users** can see and manage all payees in the system

## User Roles Setup

### Current Users:
- `bunnyppl@gmail.com` - **Admin** role
- `kenken64@hotmail.com` - **User** role  
- `bunnyppl@hotmail.com` - **User** role

### To setup roles:
```bash
cd frontend
node assign-admin.js
```

## Implementation Details

### 1. Database Schema Updates
- Added `role` field to users collection ('user' | 'admin')
- Added `userId` field to payees collection (references user._id)
- Migrated existing payees to admin ownership

### 2. Authentication Middleware Enhanced
- Updated `withAuth` middleware to fetch user role from database
- Enhanced `AuthenticatedRequest` interface to include role and email
- Updated `withOptionalAuth` for optional authentication scenarios

### 3. Role-Based Filtering Utilities (`lib/role-filter.ts`)
- `buildUserFilter()` - Creates MongoDB filter based on user role
- `canAccessUserData()` - Checks if user can access specific data
- `isAdmin()` - Checks admin privileges
- `requireAdmin()` - Throws error if not admin

### 4. API Routes Updated

#### GET /api/payees
- **Admin**: Returns all payees
- **User**: Returns only payees owned by the user
- Includes `userRole` in response for frontend

#### POST /api/payees
- Always sets `userId` to current authenticated user
- All users can create payees

#### GET /api/payees/[id]
- **Admin**: Can view any payee
- **User**: Can only view their own payees
- Returns 403 if access denied

#### PUT /api/payees/[id]
- **Admin**: Can update any payee
- **User**: Can only update their own payees
- Prevents changing `userId` field

#### DELETE /api/payees/[id]
- **Admin**: Can delete any payee
- **User**: Can only delete their own payees

## Security Features

1. **Database-level filtering**: Queries are filtered at MongoDB level
2. **Access control checks**: Each individual resource access is validated
3. **Audit logging**: All access attempts are logged with user info
4. **Role validation**: User roles are fetched fresh from database on each request

## Frontend Integration

The API responses include `userRole` field that frontend can use to:
- Show/hide admin-only features
- Display appropriate UI elements
- Handle role-based navigation

## Example Usage

```typescript
// Admin user sees all payees
GET /api/payees -> { payees: [all payees], userRole: 'admin' }

// Regular user sees only their payees  
GET /api/payees -> { payees: [own payees], userRole: 'user' }

// User tries to access other user's payee
GET /api/payees/someId -> 403 Access Denied (if not their payee)
```

## Migration

Existing payees were migrated to admin ownership. For production:
1. Backup database before migration
2. Run migration script to assign payees to appropriate users
3. Verify role assignments are correct
4. Test both admin and user scenarios

## Testing

The implementation includes comprehensive access control:
- ✅ Admin can access all payees
- ✅ Users can only access their own payees
- ✅ Proper error responses for unauthorized access
- ✅ Logging for security monitoring
