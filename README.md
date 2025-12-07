# Tawann Space - Backend API
A robust RESTful API backend for the Tawann Space blog platform. Built with Express.js and PostgreSQL, this API provides comprehensive endpoints for article management, user authentication, comments, likes, and real-time notifications.

## 🚀 Features

### Authentication & Authorization
- 🔐 JWT-based authentication with Supabase Auth
- 👤 User registration and login
- 🔑 Password reset functionality
- 👥 Role-based access control (User/Admin)
- 🛡️ Protected routes with middleware

### Article Management
- 📝 Create, read, update, and delete articles (Admin only)
- 🗂️ Category-based article organization
- 🔍 Search functionality with keyword filtering
- 📄 Pagination support for article listings
- 📊 Article status management (published/draft)

### User Interactions
- ❤️ Like/unlike articles with toggle functionality
- 💬 Comment system for articles
- 👁️ Track like status per user
- 📝 Real-time comment display

### Media Management
- 🖼️ Image upload to Supabase Storage
- 📦 Multer integration for file handling
- 🌐 Public URL generation for uploaded images

### Admin Features
- 🔔 Real-time notification system for comments and likes
- 📊 Category management (CRUD operations)
- 👥 User interaction tracking
- 🔖 Mark notifications as read with database persistence

## 🛠️ Tech Stack

### Core
- **Express.js 5** - Fast, minimalist web framework
- **Node.js** - JavaScript runtime
- **PostgreSQL** - Relational database
- **Supabase** - Backend-as-a-Service for auth and storage

### Key Libraries
- **@supabase/supabase-js** - Supabase client for authentication and storage
- **pg** - PostgreSQL client for Node.js
- **multer** - Middleware for handling multipart/form-data
- **cors** - Cross-Origin Resource Sharing
- **dotenv** - Environment variable management
- **nodemon** - Development auto-reload

## 📁 Project Structure

```
server/
├── routes/              # API route handlers
│   ├── auth.mjs        # Authentication & user routes
│   └── post.mjs        # Post-related routes
├── middleware/          # Express middleware
│   ├── protectAdmin.mjs    # Admin role protection
│   ├── protectUser.mjs     # User authentication
│   └── postValidation.mjs  # Post data validation
├── utils/              # Utility functions
│   └── db.mjs         # Database connection pool
├── app.mjs            # Express app configuration
├── package.json       # Project dependencies
└── .env              # Environment variables
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Supabase account and project

### Environment Variables

Create a `.env` file in the server directory:

```env
PORT=4001
CONNECTION_STRING=your_postgresql_connection_string
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

1. Clone the repository
```bash
git clone https://github.com/Pimtawann/tawann-space-db-api.git
cd tawann-space-db-api/server
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Start development server
```bash
npm run devStart
```

The API will be available at `http://localhost:4001`

## 📜 Available Scripts

- `npm start` - Start production server with nodemon
- `npm run devStart` - Start development server with auto-reload
- `npm test` - Run tests (to be implemented)

## 🌐 API Endpoints

### Authentication Routes (`/auth`)

#### User Authentication
- `POST /auth/register` - Register new user
  - Body: `{ email, password, username, name }`
  - Returns: User object with success message

- `POST /auth/login` - User login
  - Body: `{ email, password }`
  - Returns: JWT access token

- `GET /auth/get-user` - Get current user profile
  - Headers: `Authorization: Bearer {token}`
  - Returns: User profile data

- `PUT /auth/update-profile` - Update user profile
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ name, username, profilePic, bio }`
  - Returns: Updated user object

- `PUT /auth/reset-password` - Reset user password
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ oldPassword, newPassword }`
  - Returns: Success message

#### Category Management
- `GET /auth/categories` - Get all categories
  - Returns: Array of categories

- `POST /auth/categories` - Create new category (Admin only)
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ name }`
  - Returns: Created category

- `PUT /auth/categories/:categoryId` - Update category (Admin only)
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ name }`
  - Returns: Updated category

- `DELETE /auth/categories/:categoryId` - Delete category (Admin only)
  - Headers: `Authorization: Bearer {token}`
  - Returns: Success message

#### Notification Management
- `GET /auth/notifications` - Get notifications (Admin only)
  - Headers: `Authorization: Bearer {token}`
  - Query: `?page=1&unreadOnly=true`
  - Returns: Paginated notifications with read status

- `POST /auth/notifications/read` - Mark notification as read (Admin only)
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ notificationId }`
  - Returns: Success message

### Post Routes (`/posts`)

#### Post CRUD
- `GET /posts` - Get all posts with pagination
  - Query: `?category=tech&keyword=search&page=1&limit=6`
  - Returns: Paginated posts with metadata

- `GET /posts/:postId` - Get single post by ID
  - Returns: Post details with category and status

- `POST /posts` - Create new post (Admin only)
  - Headers: `Authorization: Bearer {token}`
  - Body: FormData with `{ title, category_id, description, content, status_id, imageFile }`
  - Returns: Success message

- `PUT /posts/:postId` - Update post (Admin only)
  - Headers: `Authorization: Bearer {token}`
  - Body: FormData with updated fields
  - Returns: Success message

- `DELETE /posts/:postId` - Delete post (Admin only)
  - Headers: `Authorization: Bearer {token}`
  - Returns: Success message

#### Post Interactions
- `POST /posts/:postId/like` - Toggle like on post
  - Headers: `Authorization: Bearer {token}`
  - Returns: Updated like count and status

- `GET /posts/:postId/liked` - Check if user liked post
  - Headers: `Authorization: Bearer {token}`
  - Returns: `{ liked: boolean }`

- `GET /posts/:postId/comments` - Get all comments for post
  - Returns: Array of comments with user info

- `POST /posts/:postId/comments` - Add comment to post
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ content }`
  - Returns: Created comment object

## 🔐 Authentication & Security

### JWT Token Authentication
- All protected routes require a valid JWT token in the Authorization header
- Format: `Authorization: Bearer {your_access_token}`
- Tokens are generated on login and validated using Supabase Auth

### Role-Based Access Control

**Public Access**
- Get all posts
- Get single post
- Get categories
- Get comments

**User Access** (Requires authentication)
- All public access features
- Like/unlike posts
- Comment on posts
- Update own profile
- Reset password

**Admin Access** (Requires admin role)
- All user access features
- Create, update, delete posts
- Manage categories
- View and manage notifications

### Middleware Protection

- `protectUser.mjs` - Verifies JWT token and user authentication
- `protectAdmin.mjs` - Verifies JWT token and admin role
- `postValidation.mjs` - Validates post data before processing

## 🗄️ Database Schema

### Main Tables
- **users** - User profiles and authentication data
- **posts** - Blog articles with content and metadata
- **categories** - Article categories
- **statuses** - Post status (published/draft)
- **comments** - User comments on posts
- **post_likes** - Like tracking for posts
- **notification_reads** - Read status for admin notifications

### Key Relationships
- Posts belong to categories
- Posts have many comments
- Posts have many likes
- Users can comment and like posts
- Admins receive notifications for comments and likes

## 🔄 CORS Configuration

The API allows requests from:
- `http://localhost:5173` - Local development
- `https://tawann-space.vercel.app` - Production frontend

Allowed methods: GET, POST, PUT, DELETE, OPTIONS

## 📦 Deployment

### Production Environment
- Deployed on: Vercel
- Production URL: `https://tawann-space-db-api.vercel.app`
- Database: PostgreSQL (Supabase/managed service)
- Storage: Supabase Storage for images

### Vercel Configuration
See `vercel.json` for deployment configuration

## 🎯 Key Implementation Features

### Pagination System
- Supports `page` and `limit` query parameters
- Returns total count, total pages, and navigation info
- Default limit: 6 posts per page
- Maximum limit: 100 posts per page

### Search & Filtering
- Keyword search across title, description, and content
- Category-based filtering
- Combined search and category filtering support
- Case-insensitive search using ILIKE

### Image Upload Flow
1. Client sends FormData with image file
2. Server validates file presence
3. Upload to Supabase Storage bucket
4. Generate public URL
5. Store URL in database
6. Return success response

### Notification System
- Tracks comments and likes on articles
- Real-time notification generation
- Read/unread status per admin user
- 30-day notification retention
- Pagination support for notification list
- Filter option for unread notifications only

### Like Toggle Logic
- Check if user has already liked the post
- If liked: Remove like and decrement counter
- If not liked: Add like and increment counter
- Return updated like count and status
- Prevent negative like counts

## 🔍 Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## 🚀 Performance Considerations

- Connection pooling for PostgreSQL
- Efficient database queries with proper indexing
- Pagination to limit data transfer
- Image optimization via Supabase Storage
- CORS configuration for security

---

Built with ❤️ using Express.js and PostgreSQL
