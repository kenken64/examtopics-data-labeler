import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  // Check if we have environment variables
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'awscert';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  // If we already have a cached connection, test it first
  if (cachedDb && client) {
    try {
      // Quick ping to test if connection is still alive
      await client.db('admin').command({ ping: 1 });
      return cachedDb;
    } catch (error) {
      console.log('🔄 Cached MongoDB connection lost, reconnecting...');
      client = null;
      cachedDb = null;
    }
  }

  try {
    // Create new client with better timeout settings
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,     // 5 seconds to connect
      socketTimeoutMS: 5000,      // 5 seconds for socket operations
      serverSelectionTimeoutMS: 5000, // 5 seconds to select a server
      maxPoolSize: 10,            // Maximum number of connections
      minPoolSize: 1,             // Minimum number of connections
      maxIdleTimeMS: 30000,       // Close connections after 30 seconds of inactivity
    });
    
    await client.connect();
    
    // Get the database using the dynamic name
    cachedDb = client.db(dbName);
    
    console.log(`Connected to MongoDB database: ${dbName}`);
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    cachedDb = null;
  }
}

// Utility function to get the database name
export function getDatabaseName(): string {
  return process.env.MONGODB_DB_NAME || 'awscert';
}

// Utility function to get the connection URI (without database name)
export function getConnectionUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  return uri;
}
