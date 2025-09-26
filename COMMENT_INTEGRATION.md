# Comment System Integration

This document describes the integration of the comment, reply, and like functionality into the Stonk Terminal application.

## Overview

The comment system has been fully integrated with the provided API specification, replacing the hardcoded mock data with real API calls.

## Features Implemented

### ✅ Comment Management

- Create comments on tokens
- Read comments with pagination
- Update comments (edit functionality)
- Delete comments
- Real-time like status loading

### ✅ Reply Management

- Create replies to comments
- Read replies with pagination
- Update replies (edit functionality)
- Delete replies
- Nested reply display

### ✅ Like System

- Toggle likes on comments and replies
- Real-time like count updates
- Like status persistence

### ✅ User Authentication

- User context for authentication
- Wallet integration
- User ID management

### ✅ Error Handling

- Comprehensive error handling
- Loading states
- Toast notifications for user feedback

## API Integration

The system integrates with the following API endpoints:

### Comment Endpoints

- `POST /api/comment` - Create comment
- `GET /api/comment` - Get comments with pagination
- `GET /api/comment/:id` - Get comment by ID
- `PUT /api/comment/:id` - Update comment
- `DELETE /api/comment/:id` - Delete comment

### Reply Endpoints

- `POST /api/comment/reply` - Create reply
- `GET /api/comment/reply` - Get replies with pagination
- `GET /api/comment/reply/:id` - Get reply by ID
- `PUT /api/comment/reply/:id` - Update reply
- `DELETE /api/comment/reply/:id` - Delete reply

### Like Endpoints

- `POST /api/comment/like` - Toggle like
- `GET /api/comment/like/status` - Get like status

### Statistics Endpoint

- `GET /api/comment/stats/:tokenId` - Get comment statistics

## File Structure

```
src/
├── api/
│   └── comment.ts                 # Comment API service
├── components/
│   └── Comments/
│       ├── Comment.tsx           # Comment component
│       ├── Reply.tsx             # Reply component
│       ├── CommentsSection.tsx   # Main comments section
│       └── CommentModal.tsx      # Comment creation modal
├── contexts/
│   └── UserContext.tsx           # User authentication context
├── hooks/
│   └── useComments.ts            # Comment state management hook
└── utils/
    └── apiConfig.ts              # API configuration utility
```

## Usage

### Basic Usage

The comment system is automatically integrated into the token detail page. Users can:

1. View existing comments and replies
2. Create new comments
3. Reply to existing comments
4. Like/unlike comments and replies
5. Edit their own comments and replies
6. Delete their own comments and replies

### User Authentication

The system uses wallet addresses as user identifiers. When a user connects their wallet, they are automatically logged in and can interact with the comment system.

### Environment Variables

Make sure to set the following environment variable:

```env
VITE_API_URL=your_api_base_url
```

## API Response Format

All API responses follow this format:

```typescript
{
  success: boolean;
  message: string;
  data: T;
  error?: any; // Only in development mode
}
```

## Error Handling

The system includes comprehensive error handling:

- Network errors are caught and displayed to users
- API errors are shown with descriptive messages
- Loading states prevent multiple simultaneous requests
- Toast notifications provide user feedback

## Future Enhancements

- Real-time updates using WebSocket connections
- Comment moderation features
- User profile integration
- Comment threading improvements
- Search and filtering capabilities

## Testing

To test the comment functionality:

1. Ensure the API server is running
2. Set the `VITE_API_URL` environment variable
3. Connect a wallet
4. Navigate to a token detail page
5. Try creating, editing, and deleting comments and replies

The system will automatically handle API calls and update the UI accordingly.
