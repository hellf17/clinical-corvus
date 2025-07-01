import { Pool } from 'pg';

// Use InstanceType to get the type of an instance created by the Pool class
let pool: InstanceType<typeof Pool> | undefined;

// Check if the pool already exists to prevent recreation during hot-reloads in development
if (!(global as any)._pgPool) {
  console.log("Creating new PostgreSQL connection pool...");
  if (!process.env.POSTGRES_URL) {
    // Log error but maybe don't crash the build immediately?
    // Or throw: throw new Error('POSTGRES_URL environment variable is not set.');
    console.error('CRITICAL ERROR: POSTGRES_URL environment variable is not set.');
    // Assigning a dummy/null value or handling differently might be needed
    // depending on how downstream code handles a missing pool.
    // For now, let's assign undefined to satisfy typing, but this WILL cause runtime errors.
    (global as any)._pgPool = undefined; 
  } else {
    (global as any)._pgPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Example SSL config for production
    });
  }
}

pool = (global as any)._pgPool;

// Export the pool instance. Consumers might need to check if it's defined.
export default pool as InstanceType<typeof Pool> | undefined; 