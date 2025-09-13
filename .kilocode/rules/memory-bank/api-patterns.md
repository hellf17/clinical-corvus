# Clinical Corvus - API Routing & Proxy Patterns

## Overview
Clinical Corvus uses a centralized routing pattern with clear separation between frontend proxy routes and backend API endpoints. All backend APIs are exposed under `/api/*` prefix, with frontend routes acting as simple proxies.

## Backend Routing Architecture

### Centralized Routing in `main.py`
All backend API endpoints are registered in `backend-api/main.py` with consistent `/api/<domain>` prefixes:

```python
# Example from main.py
app.include_router(research_router, prefix="/api/research", tags=["research"])
app.include_router(clinical_router, prefix="/api/clinical", tags=["clinical"])
```

### Router Organization
- **research_router**: `/api/research/*` - Research and evidence-based medicine
- **clinical_router**: `/api/clinical/*` - Clinical analysis and patient data
- **patients_router**: `/api/patients/*` - Patient management CRUD operations
- **auth_router**: `/api/auth/*` - Authentication and user management
- **files_router**: `/api/files/*` - File upload and processing
- **mcp_router**: `/api/mcp/*` - MCP server integration

### Key Backend Endpoints

#### Research Endpoints
- `GET /api/research/formulate-pico-translated` - Generate PICO questions with translation
- `POST /api/research/quick-search-translated` - Quick research with Portuguese results
- `POST /api/research/autonomous-translated` - Autonomous research mode
- `GET /api/research/unified-evidence-analysis-translated` - Evidence synthesis

#### Clinical Endpoints
- `POST /api/clinical/differential-diagnosis` - Generate differential diagnoses
- `POST /api/clinical/check-lab-abnormalities` - Analyze lab results
- `POST /api/clinical/generate-insights` - Generate clinical insights
- `GET /api/clinical/patient-summary/{patient_id}` - Patient data summary

#### Patient Management
- `GET /api/patients` - List all patients (with role-based filtering)
- `POST /api/patients` - Create new patient
- `GET /api/patients/{id}` - Get patient details
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Delete patient
- `GET /api/patients/{id}/vitals` - Patient vital signs
- `GET /api/patients/{id}/labs` - Patient lab results
- `GET /api/patients/{id}/medications` - Patient medications

## Frontend Proxy Pattern

### Proxy Route Structure
All frontend API routes are located in `frontend/src/app/api/*` and act as simple proxies:

```
frontend/src/app/api/
├── research-assistant/
│   ├── formulate-pico-translated/route.ts
│   ├── quick-search-translated/route.ts
│   └── autonomous-translated/route.ts
├── clinical-assistant/
│   ├── check-lab-abnormalities/route.ts
│   ├── generate-insights/route.ts
│   └── differential-diagnosis/route.ts
├── patients/
│   ├── [id]/
│   │   ├── route.ts
│   │   ├── vitals/route.ts
│   │   ├── labs/route.ts
│   │   └── medications/route.ts
│   └── route.ts
```

### Proxy Implementation Pattern
All proxy routes follow the same pattern:

```typescript
// Example: frontend/src/app/api/research-assistant/formulate-pico-translated/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward to backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/research/formulate-pico-translated`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
```

### Key Benefits of Proxy Pattern
1. **No Route Duplication**: Single source of truth for API endpoints
2. **Consistent Authentication**: Headers forwarded automatically
3. **CORS Simplified**: Frontend handles CORS through Next.js
4. **Environment Management**: Backend URL configurable per environment
5. **Error Handling**: Centralized error handling in frontend

## Authentication Flow

### Clerk Integration
- **Frontend**: `@clerk/nextjs` for React components
- **Backend**: JWT validation using Clerk's public keys
- **Middleware**: Next.js middleware for route protection

### Role-Based Access
- **Doctor Role**: Full access to patient management, clinical analysis
- **Patient Role**: Limited to own data, health tracking features
- **Admin Role**: System administration (future)

### Authentication Endpoints
- `POST /api/auth/set-role` - Set user role after registration
- `GET /api/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh authentication token

## File Upload Architecture

### Upload Flow
1. **Frontend**: File selection and validation
2. **Proxy Route**: `/api/files/upload` forwards to backend
3. **Backend**: Process file, extract data, store in database
4. **Response**: Return processed data with extracted insights

### Supported File Types
- **PDF**: Lab reports, medical documents
- **Images**: JPG, PNG for visual analysis
- **CSV**: Bulk data import (future)

### File Processing Pipeline
1. **Validation**: File type and size checks
2. **Extraction**: Text extraction using PyPDF2 or OCR
3. **Analysis**: Clinical analyzers for data interpretation
4. **Storage**: Secure file storage with metadata
5. **Indexing**: Full-text search capabilities

## Error Handling Patterns

### Backend Error Responses
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { "additional": "context" }
}
```

### Frontend Error Handling
- **Network Errors**: Retry with exponential backoff
- **Validation Errors**: Display field-specific messages
- **Server Errors**: Show user-friendly messages with action items
- **Timeout Errors**: Provide graceful degradation

## Rate Limiting

### Backend Rate Limits
- **Research APIs**: 100 requests per minute per user
- **Clinical Analysis**: 50 requests per minute per user
- **File Upload**: 10 files per minute per user
- **Authentication**: 5 attempts per minute per IP

### Frontend Rate Limiting
- **Debounced Inputs**: 300ms delay for search inputs
- **Request Queuing**: Batch similar requests
- **Caching**: Cache research results for 1 hour

## API Versioning Strategy

### Current Version
- **Base URL**: `/api/v1/*` (implied, not explicitly versioned)
- **Breaking Changes**: Will introduce `/api/v2/*` when needed
- **Deprecation**: 6-month notice for deprecated endpoints

### Version Headers
- **Request**: `X-API-Version: 1.0`
- **Response**: `X-API-Version: 1.0` and `Deprecation` headers

## Testing Patterns

### API Testing
- **Unit Tests**: Individual endpoint testing with mocked dependencies
- **Integration Tests**: Full request/response cycle testing
- **Load Tests**: Performance testing under concurrent load
- **Security Tests**: Authentication and authorization testing

### Test Data Management
- **Fixtures**: Reusable test data for common scenarios
- **Database Seeding**: Automated test database setup
- **Mock Services**: External API mocking for consistent tests
- **Cleanup**: Automatic test data cleanup after runs