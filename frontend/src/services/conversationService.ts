// Service for server-side conversation logic (if any)
// For now, it only defines API_URL, consider moving to a shared config

// import { auth } from '@clerk/nextjs/server'; // Removed server-side import
import { API_URL } from '@/lib/config'; // Import centralized API_URL

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Removed local definition

// Removed ConversationSummary interface (moved to client service)

// Removed getClerkAuthToken function

// Removed getRecentConversations function (moved to client service)

// TODO: Add other server-specific conversation functions if needed 