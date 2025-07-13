import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getDatabaseName, getConnectionUri } from '@/lib/mongodb';

interface CollectionInfo {
  count: number;
  sampleData: string[] | null;
  sampleId: string | null;
}

interface DatabaseInfo {
  exists: boolean;
  collections?: Record<string, CollectionInfo>;
  totalCollections?: number;
  error?: string;
}

export async function GET() {
  try {
    const uri = getConnectionUri();
    const expectedDbName = getDatabaseName();
    
    if (!uri) {
      return NextResponse.json({
        error: 'MONGODB_URI not configured'
      }, { status: 503 });
    }

    const client = new MongoClient(uri);
    
    try {
      await client.connect();
      
      // List all databases
      const admin = client.db('admin');
      const dbList = await admin.admin().listDatabases();
      
      // Check specific databases that your app uses
      const databases = ['test', expectedDbName];
      const dbInfo: Record<string, DatabaseInfo> = {};
      
      for (const dbName of databases) {
        try {
          const db = client.db(dbName);
          const collections = await db.listCollections().toArray();
          
          const collectionsInfo: Record<string, CollectionInfo> = {};
          for (const collection of collections) {
            const collectionName = collection.name;
            const count = await db.collection(collectionName).countDocuments();
            const sample = await db.collection(collectionName).findOne();
            
            collectionsInfo[collectionName] = {
              count: count,
              sampleData: sample ? Object.keys(sample) : null,
              sampleId: sample?._id ? sample._id.toString() : null
            };
          }
          
          dbInfo[dbName] = {
            exists: true,
            collections: collectionsInfo,
            totalCollections: collections.length
          };
        } catch (error) {
          dbInfo[dbName] = {
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
      
      await client.close();
      
      return NextResponse.json({
        status: 'success',
        connectionString: uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        allDatabases: dbList.databases.map(db => ({
          name: db.name,
          sizeOnDisk: db.sizeOnDisk || 0
        })),
        applicationDatabases: dbInfo,
        recommendations: {
          currentConnectionDatabase: uri.split('/').pop()?.split('?')[0] || 'unknown',
          applicationExpectedDatabase: expectedDbName,
          issue: dbInfo[expectedDbName]?.exists ? 'Database exists but might be empty' : `Database ${expectedDbName} does not exist or is not accessible`
        }
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      
    } catch (connectionError) {
      await client.close().catch(() => {});
      
      return NextResponse.json({
        status: 'error',
        error: connectionError instanceof Error ? connectionError.message : 'Unknown connection error',
        connectionString: uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      }, { status: 503 });
    }
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
