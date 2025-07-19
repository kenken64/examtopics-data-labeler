// Mongoose ODM for MongoDB database operations and schema definitions
import mongoose from 'mongoose';

// MongoDB connection string from environment variables
// This should point to your MongoDB instance (local or cloud)
const MONGODB_URI = process.env.MONGODB_URI;

// Validate that MongoDB URI is configured
// Fail fast if the environment variable is missing to prevent runtime errors
if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global connection cache to prevent multiple database connections
 * 
 * In serverless environments like Vercel, functions can be created and destroyed frequently.
 * Without connection caching, each function execution would create a new database connection,
 * quickly exhausting the connection pool and causing performance issues.
 * 
 * This cache pattern ensures:
 * - Single connection per Node.js process
 * - Connection reuse across multiple function invocations
 * - Automatic connection management by Mongoose
 */
let cached = global as typeof global & {
  mongooseConnection?: typeof mongoose;  // Cached Mongoose connection instance
  promise?: Promise<typeof mongoose>;    // Connection promise to prevent multiple simultaneous connections
};

/**
 * Database Connection Manager
 * 
 * This function handles MongoDB connection with intelligent caching for serverless environments.
 * It implements the connection pattern recommended for Next.js and serverless deployments.
 * 
 * Connection Strategy:
 * 1. Return existing connection if available (cache hit)
 * 2. Create new connection promise if none exists
 * 3. Wait for connection completion and cache the result
 * 4. Return the established connection
 * 
 * Key Features:
 * - Connection pooling through Mongoose
 * - Serverless-optimized caching
 * - Automatic reconnection handling
 * - Buffer command management for reliability
 * 
 * @returns Promise<typeof mongoose> - Established Mongoose connection
 */
async function dbConnect() {
  // Return cached connection if already established
  // This avoids creating multiple connections in the same process
  if (cached.mongooseConnection) {
    return cached.mongooseConnection;
  }

  // Create new connection promise if none exists
  // This prevents multiple simultaneous connection attempts
  if (!cached.promise) {
    // Mongoose connection options optimized for serverless
    const opts = {
      bufferCommands: false,  // Disable command buffering for immediate error feedback
    };

    // Create and cache the connection promise
    // Using .then() to ensure proper promise chaining and caching
    // MONGODB_URI is guaranteed to be defined due to the check above
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  // Wait for connection completion and cache the result
  cached.mongooseConnection = await cached.promise;
  return cached.mongooseConnection;
}

// Export the connection function as default for easy importing
export default dbConnect;

/**
 * Passkey Schema Definition
 * 
 * Defines the structure for WebAuthn passkey credentials stored in MongoDB.
 * Each passkey represents a registered authenticator device for a user.
 * 
 * WebAuthn Flow:
 * 1. User registers a device (fingerprint, face ID, security key, etc.)
 * 2. Browser generates a credential with public/private key pair
 * 3. Public key and metadata are stored in this schema
 * 4. During login, the device signs a challenge with the private key
 * 5. Server verifies the signature using the stored public key
 * 
 * Security Features:
 * - Each credential has a unique ID to prevent replay attacks
 * - Counter prevents cloned authenticator attacks
 * - Transport methods optimize authentication UX
 * - Public key enables signature verification
 */
const passkeySchema = new mongoose.Schema({
  credentialID: {
    type: String,
    required: true,
    unique: true,     // Each credential must have a unique identifier
  },
  publicKey: {
    type: String,
    required: true,   // Public key for signature verification
  },
  counter: {
    type: Number,
    required: true,   // Anti-cloning protection counter
  },
  transports: {
    type: [String],   // Available transport methods (USB, NFC, BLE, internal)
  },
});

/**
 * User Schema Definition
 * 
 * Defines the structure for user accounts in the authentication system.
 * This schema supports passwordless authentication through WebAuthn passkeys.
 * 
 * Key Features:
 * - Unique username requirement for user identification
 * - Multiple passkey support (user can register multiple devices)
 * - No password field (fully passwordless system)
 * - Embedded passkey documents for performance
 * 
 * Usage Pattern:
 * - One user can have multiple passkeys (phone, laptop, security key, etc.)
 * - Each passkey is a subdocument with its own credential details
 * - Authentication requires matching username + valid passkey signature
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,     // Username must be unique across the system
  },
  passkeys: [passkeySchema],  // Array of registered passkey credentials
  role: {
    type: String,
    default: 'user',  // Default role for all users
    enum: ['user', 'admin'], // Allowed role values
  },
  // Profile fields
  firstName: {
    type: String,
    trim: true,
    default: '',
  },
  lastName: {
    type: String,
    trim: true,
    default: '',
  },
  contactNumber: {
    type: String,
    trim: true,
    default: '',
  },
  dateOfBirth: {
    type: Date,
  },
  location: {
    type: String,
    trim: true,
    default: '',
  },
});

/**
 * User Model Export
 * 
 * Creates or reuses the User model for database operations.
 * Uses Mongoose's model caching to prevent re-compilation errors in serverless environments.
 * 
 * The model provides:
 * - CRUD operations for user management
 * - Built-in validation based on schema
 * - Middleware hooks for custom logic
 * - Query optimization and indexing
 */
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Export the User model for use in authentication routes
export { User };
