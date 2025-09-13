import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
// Removed CoreMessage import as we won't type explicitly here
// import { CoreMessage } from 'ai'; 
import pool from '@/lib/db'; // Import the pool

// TODO: Import your PostgreSQL connection setup
// import pool from '@/lib/db'; // Example

// Define an interface for the database row structure
interface ChatMessageRow {
  id: string | number; // Adjust based on actual DB type (e.g., number if integer, string if UUID)
  role: 'user' | 'assistant' | 'system' | 'tool'; // Be more specific if possible
  content: string | null;
  toolName: string | null;
  toolInput: string | null;
  toolResult: string | null;
  createdAt: Date | string; // Adjust based on how pg returns dates
}

// Define the structure for the API response message
interface ApiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | undefined;
  tool_call_id?: string | undefined;
  tool_name?: string | undefined;
  tool_args?: any;
}

interface RouteParams {
  params: {
    id: string; // Conversation ID from the URL
  }
}

// GET /api/conversations/[id]/messages - Fetch messages for a specific conversation
export async function GET(req: Request, { params }: RouteParams) {
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

    console.log(`TODO: Fetch messages for conversation ${conversationId}, checking ownership for user ${user.id}`);

    // Check if the pool is defined before trying to connect
    if (!pool) {
      console.error('Database pool is not initialized. POSTGRES_URL might be missing or invalid.');
      return NextResponse.json({ error: 'Internal Server Error: Database connection failed' }, { status: 500 });
    }

    client = await pool.connect();
    // 1. Verify user owns the conversation
    const convoCheck = await client.query(
        'SELECT "userId" FROM "Conversation" WHERE id = $1',
        [conversationId]
    );
    if (convoCheck.rowCount === 0 || convoCheck.rows[0].userId !== user.id) {
       client.release(); // Release client before returning
       return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 });
    }
    
    // 2. Fetch messages
    const result = await client.query(
      'SELECT id, role, content, "toolName", "toolInput", "toolResult", "createdAt" FROM "ChatMessage" WHERE "conversationId" = $1 ORDER BY "createdAt" ASC',
      [conversationId]
    );
    
    // Map DB rows to the format expected by the frontend (including id)
    const messages = result.rows.map((row: ChatMessageRow) => {
        // Explicitly type the message object
        const msg: ApiChatMessage = {
             id: row.id.toString(), 
             role: row.role,
             content: row.content ?? undefined, // Convert null to undefined initially
             // tool properties are initially undefined
        };
        
        if (row.role === 'tool') {
            // Adjust based on frontend/useChat expectations for tool messages
            msg.tool_call_id = row.id.toString(); // Map DB id to tool_call_id
            msg.tool_name = row.toolName ?? undefined; // Handle potential null
            // Assign content, converting null to undefined
            msg.content = (row.toolResult || row.content) ?? undefined;
        }
         // TODO: Handle 'assistant' role with tool_calls array if needed
        
        // No need to delete undefined properties if interface uses optional (?)
        // Object.keys(msg).forEach(key => msg[key as keyof typeof msg] === undefined && delete msg[key as keyof typeof msg]);
        
        return msg;
   });
  
    client.release(); // Release client
    return NextResponse.json(messages);

  } catch (error: any) {
    console.error(`Error fetching messages for conversation ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch messages', details: error.message }, { status: 500 });
  }
}

// POST /api/conversations/[id]/messages - Send a new message to a conversation
export async function POST(req: Request, { params }: RouteParams) {
  let client;
  try {
    const user = await currentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = params;
    const body = await req.json();
    const { content, role = 'user' } = body;

    if (!conversationId || !content) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'conversationId and content are required'
      }, { status: 400 });
    }

    // Check if the pool is defined before trying to connect
    if (!pool) {
      console.error('Database pool is not initialized. POSTGRES_URL might be missing or invalid.');
      return NextResponse.json({ error: 'Internal Server Error: Database connection failed' }, { status: 500 });
    }

    client = await pool.connect();
    
    // 1. Verify user owns the conversation
    const convoCheck = await client.query(
        'SELECT "userId" FROM "Conversation" WHERE id = $1',
        [conversationId]
    );
    if (convoCheck.rowCount === 0 || convoCheck.rows[0].userId !== user.id) {
       client.release();
       return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 });
    }

    // 2. Insert the new message
    const result = await client.query(
      'INSERT INTO "ChatMessage" ("conversationId", role, content, "createdAt") VALUES ($1, $2, $3, NOW()) RETURNING id, role, content, "createdAt"',
      [conversationId, role, content]
    );
    
    const newMessage = result.rows[0];
    
    // 3. Format the response in the same format as GET
    const formattedMessage: ApiChatMessage = {
      id: newMessage.id.toString(),
      role: newMessage.role,
      content: newMessage.content,
    };

    client.release();
    return NextResponse.json(formattedMessage, { status: 201 });

  } catch (error: any) {
    console.error(`Error sending message to conversation ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to send message', details: error.message }, { status: 500 });
  } finally {
    if (client) {
        client.release();
    }
  }
}