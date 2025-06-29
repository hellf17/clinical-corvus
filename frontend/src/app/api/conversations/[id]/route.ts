import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import pool from '@/lib/db'; // Import the pool

// TODO: Import your PostgreSQL connection setup
// import pool from '@/lib/db'; // Example

interface RouteParams {
  params: {
    id: string; // Conversation ID from the URL
  }
}

// DELETE /api/conversations/[id] - Delete a specific conversation and its messages
export async function DELETE(req: Request, { params }: RouteParams) {
  let client;
  try {
    const user = await currentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = params;

    if (!conversationId) {
       return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
    }

    console.log(`TODO: Delete conversation ${conversationId} and its messages, checking ownership for user ${user.id}`);

    // Check if the pool is defined before trying to connect
    if (!pool) {
      console.error('Database pool is not initialized. POSTGRES_URL might be missing or invalid.');
      return NextResponse.json({ error: 'Internal Server Error: Database connection failed' }, { status: 500 });
    }

    client = await pool.connect();
    await client.query('BEGIN'); // Start transaction

    // 1. Verify user owns the conversation before deleting
    const convoCheck = await client.query(
        'SELECT "userId" FROM "Conversation" WHERE id = $1',
        [conversationId]
    );

    let authorized = false;
    if (convoCheck && convoCheck.rowCount && convoCheck.rowCount > 0 && convoCheck.rows[0].userId === user.id) {
        authorized = true;
    }
    
    if (!authorized) {
        // If not found OR not owned by user
        await client.query('ROLLBACK');
        client.release();
        const status = convoCheck.rowCount === 0 ? 404 : 403;
        const message = convoCheck.rowCount === 0 ? 'Conversation not found' : 'Unauthorized to delete this conversation';
        return NextResponse.json({ error: message }, { status });
    }
    
    // 2. Delete messages associated with the conversation
    await client.query('DELETE FROM "ChatMessage" WHERE "conversationId" = $1', [conversationId]);
    
    // 3. Delete the conversation itself
    await client.query('DELETE FROM "Conversation" WHERE id = $1', [conversationId]);
    
    await client.query('COMMIT'); // Commit transaction
    
    return new Response(null, { status: 204 }); // Success, no content

  } catch (error: any) {
    console.error(`Error deleting conversation ${params.id}:`, error);
    // Ensure rollback happens on error
    if (client) {
        try { await client.query('ROLLBACK'); } catch (rbError) { console.error('Rollback failed:', rbError); }
    }
    return NextResponse.json({ error: 'Failed to delete conversation', details: error.message }, { status: 500 });
  } finally {
      if (client) {
          client.release();
      }
  }
} 