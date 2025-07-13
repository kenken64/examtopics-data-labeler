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

  // If we already have a cached connection, return it
  if (cachedDb && client) {
    return cachedDb;
  }

  try {
    // Create new client and connect
    client = new MongoClient(uri);
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
