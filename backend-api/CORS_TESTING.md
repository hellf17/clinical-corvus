# CORS Configuration Testing Guide

## Overview
This document provides instructions for testing and verifying the CORS configuration in the Clinical Corvus backend.

## Changes Made
1. **Enhanced CORS Configuration**: Added debug logging and improved origin handling
2. **Development Mode**: In development mode, CORS is now permissive (`allow_origins=["*"]`)
3. **Debug Middleware**: Added logging for CORS-related requests
4. **Environment Variable**: Added `ENVIRONMENT` setting to config.py

## Testing Steps

### 1. Start the Backend with Debug Logging
```bash
cd backend-api
python start_with_cors_debug.py
```

### 2. Test CORS Configuration
In a separate terminal, run the CORS test script:
```bash
cd backend-api
python test_cors.py
```

### 3. Manual Browser Test
1. Open your browser's developer tools
2. Navigate to `http://localhost:3000`
3. Try to fetch from the backend:
   ```javascript
   fetch('http://localhost:8000/api/me/health-tips')
     .then(res => res.json())
     .then(data => console.log(data))
     .catch(err => console.error(err));
   ```

### 4. Check Logs
Look for these log messages in the backend console:
- `Configured CORS origins: ['http://localhost:3000']`
- `Running in development mode - using permissive CORS settings`
- `CORS request from origin: http://localhost:3000`

## Environment Variables
Ensure these are set in your `backend-api/.env`:
```bash
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
```

## Troubleshooting
If CORS issues persist:

1. **Check Backend Logs**: Look for CORS-related debug messages
2. **Verify Port**: Ensure backend is running on port 8000
3. **Clear Browser Cache**: Sometimes browser caches CORS preflight responses
4. **Check Network Tab**: Use browser dev tools to inspect request/response headers
5. **Test with curl**:
   ```bash
   curl -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        http://localhost:8000/api/me/health-tips \
        -v
   ```

## Expected Response Headers
For successful CORS requests, you should see:
- `Access-Control-Allow-Origin: http://localhost:3000` (or `*` in development)
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
- `Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With`