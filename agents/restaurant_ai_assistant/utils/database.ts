import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = "postgresql://postgres.acpxtsugpnzazaybblug:!Restai7thpillar@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

// PostgreSQL connection configuration
const db = new Pool({
  connectionString: DB_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Initialize database tables (run this once to set up the schema)
let dbConnnected = false;
// Helper function to execute queries
export const executeQuery = async (query: string, params: any[] = []) => {
  try {
    if (!dbConnnected) {
      await db.connect();
      dbConnnected = true;
    }
    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};
