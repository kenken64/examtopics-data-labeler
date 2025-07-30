import mongoose from 'mongoose';

// Helper function to retry database operations with exponential backoff
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Database retry attempt ${attempt + 1}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`❌ Attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff: wait longer between each retry
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Helper function to test database connectivity
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Database already connected');
      return true;
    }
    
    // Try to ping the database
    await mongoose.connection.db?.admin().ping();
    console.log('✅ Database ping successful');
    return true;
  } catch (error) {
    console.log('❌ Database connectivity test failed:', error);
    return false;
  }
}
