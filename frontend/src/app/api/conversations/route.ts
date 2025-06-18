import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import pool from '@/lib/db'; // Import the pool

// GET /api/conversations - List conversations for the current user
export async function GET(req: Request) {
  let client;
  try {
    const user = await currentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the pool is defined before trying to connect
    if (!pool) {
      console.error('Database pool is not initialized. POSTGRES_URL might be missing or invalid.');
      return NextResponse.json({ error: 'Internal Server Error: Database connection failed' }, { status: 500 });
    }

    client = await pool.connect();
    const result = await client.query(
      'SELECT id, title, "updatedAt", "patientId" FROM "Conversation" WHERE "userId" = $1 ORDER BY "updatedAt" DESC',
      [user.id]
    );
    const conversations = result.rows;
    return NextResponse.json(conversations);

  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations', details: error.message }, { status: 500 });
  } finally {
    if (client) {
        client.release(); // Ensure client is released
    }
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: Request) {
  let client;
  try {
    const user = await currentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})); // Handle cases with no body
    const { title = 'Nova Conversa', patientId = null } = body;

    // Check if the pool is defined before trying to connect
    if (!pool) {
      console.error('Database pool is not initialized. POSTGRES_URL might be missing or invalid.');
      return NextResponse.json({ error: 'Internal Server Error: Database connection failed' }, { status: 500 });
    }

    client = await pool.connect();
    const result = await client.query(
      'INSERT INTO "Conversation" ("userId", title, "patientId", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, title, "updatedAt", "patientId"',
      [user.id, title, patientId]
    );
    const newConversation = result.rows[0];
    return NextResponse.json(newConversation, { status: 201 });

  } catch (error: any) {
    console.error('Error creating conversation:', error);
    // Consider more specific error checking (e.g., duplicate key)
    return NextResponse.json({ error: 'Failed to create conversation', details: error.message }, { status: 500 });
  } finally {
      if (client) {
          client.release();
      }
  }
} 