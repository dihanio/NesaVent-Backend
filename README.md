# Nesavent Backend API

Complete production-ready backend for Nesavent - Campus Event Management Platform

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22.0.0
- MongoDB >= 8.0
- Redis >= 7.0
- npm >= 10.0.0 or pnpm >= 9.0.0

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
# or
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.ts      # Main config
│   │   ├── database.ts   # MongoDB connection
│   │   └── redis.ts      # Redis connection
│   ├── models/           # Mongoose models
│   │   ├── User.ts
│   │   ├── Event.ts
│   │   ├── Registration.ts
│   │   ├── Category.ts
│   │   ├── Notification.ts
│   │   ├── Review.ts
│   │   ├── Setting.ts
│   │   └── Analytic.ts
│   ├── controllers/      # Route controllers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── event.controller.ts
│   │   ├── registration.controller.ts
│   │   ├── review.controller.ts
│   │   ├── admin.controller.ts
│   │   └── analytic.controller.ts
│   ├── services/         # Business logic
│   │   ├── auth.service.ts
│   │   ├── event.service.ts
│   │   ├── registration.service.ts
│   │   ├── payment.service.ts
│   │   ├── email.service.ts
│   │   ├── whatsapp.service.ts
│   │   ├── cloudinary.service.ts
│   │   └── notification.service.ts
│   ├── middlewares/      # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── routes/           # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── event.routes.ts
│   │   ├── registration.routes.ts
│   │   ├── review.routes.ts
│   │   ├── admin.routes.ts
│   │   └── index.ts
│   ├── utils/            # Utility functions
│   │   ├── logger.ts
│   │   ├── response.ts
│   │   ├── jwt.ts
│   │   ├── crypto.ts
│   │   ├── validation.ts
│   │   ├── qrcode.ts
│   │   └── pdf.ts
│   ├── jobs/             # Cron jobs
│   │   ├── payment.job.ts
│   │   ├── reminder.job.ts
│   │   └── analytics.job.ts
│   ├── socket/           # Socket.io handlers
│   │   └── index.ts
│   └── server.ts         # Application entry point
├── logs/                 # Application logs
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Environment Variables

See `.env.example` for all required environment variables.

### Critical Variables:
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_ACCESS_SECRET` - JWT access token secret (change in production!)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (change in production!)
- `RESEND_API_KEY` - Resend API key for emails
- `CLOUDINARY_*` - Cloudinary credentials for file uploads
- `MIDTRANS_*` - Midtrans payment gateway credentials
- `ENCRYPTION_KEY` - 32-character encryption key for QR codes

## 📚 API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "student@student.ac.id",
  "password": "SecurePass123",
  "fullName": "John Doe",
  "phone": "081234567890",
  "nim": "1234567890",
  "prodi": "Teknik Informatika",
  "angkatan": "2021",
  "role": "student"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "student@student.ac.id",
  "password": "SecurePass123"
}
```

#### Verify Email
```http
GET /api/v1/auth/verify-email?token={verificationToken}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Event Endpoints

#### Get All Events
```http
GET /api/v1/events?page=1&limit=10&category=seminar&search=tech
```

#### Get Event by Slug
```http
GET /api/v1/events/{slug}
```

#### Create Event (Organization only)
```http
POST /api/v1/events
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Tech Seminar 2025",
  "description": "Amazing tech seminar...",
  "category": "seminar",
  "poster": "https://cloudinary.com/...",
  "venue": {
    "type": "offline",
    "name": "Main Auditorium",
    "address": "Campus Building A",
    "city": "Jakarta"
  },
  "schedule": {
    "start": "2025-12-01T09:00:00Z",
    "end": "2025-12-01T17:00:00Z",
    "registrationOpen": "2025-11-01T00:00:00Z",
    "registrationClose": "2025-11-30T23:59:59Z"
  },
  "ticketTypes": [
    {
      "name": "Mahasiswa Umum",
      "price": 50000,
      "quota": 100,
      "benefits": ["Sertifikat", "Snack"],
      "salesStart": "2025-11-01T00:00:00Z",
      "salesEnd": "2025-11-30T23:59:59Z"
    }
  ],
  "contactPerson": {
    "name": "John Doe",
    "phone": "081234567890",
    "email": "contact@event.com"
  }
}
```

### Registration Endpoints

#### Create Registration
```http
POST /api/v1/registrations
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "eventId": "event_id_here",
  "ticketTypeId": "ticket_type_id",
  "participant": {
    "fullName": "Jane Doe",
    "email": "jane@student.ac.id",
    "phone": "081234567890",
    "nim": "1234567890"
  }
}
```

#### Get My Registrations
```http
GET /api/v1/registrations/my-tickets
Authorization: Bearer {accessToken}
```

#### Download Ticket
```http
GET /api/v1/registrations/{registrationId}/download-ticket
Authorization: Bearer {accessToken}
```

## 🔐 Security Features

- ✅ JWT Authentication with access & refresh tokens
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Email verification required
- ✅ Rate limiting per IP/user
- ✅ Input validation with Zod
- ✅ XSS protection
- ✅ SQL/NoSQL injection prevention
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Encrypted QR codes
- ✅ Session management with Redis
- ✅ Request logging
- ✅ Error tracking with Sentry

## 📊 Database Models

### Users
- Authentication & profile data
- Role-based access (admin, organization, student, user)
- Email verification
- Organization verification for event creators

### Events
- Complete event information
- Multiple ticket types
- Admin approval workflow
- Statistics tracking
- Search indexing

### Registrations
- Ticket booking records
- Payment integration
- QR code generation
- Check-in tracking

### Reviews
- Event ratings & feedback
- Organizer responses
- Moderation system

### Analytics
- Daily metrics aggregation
- Revenue tracking
- Demographics data

## 🎯 Key Features Implemented

### Phase 1 - Core Features ✅
- [x] User authentication & authorization
- [x] Email verification
- [x] Event CRUD operations
- [x] Registration system
- [x] Payment gateway integration (Midtrans)
- [x] E-ticket generation (QR code + PDF)
- [x] Admin approval workflow
- [x] Email notifications
- [x] File upload (Cloudinary)
- [x] Caching with Redis
- [x] Rate limiting
- [x] Error handling & logging

### Phase 2 - Enhancements (In Progress)
- [ ] WhatsApp notifications
- [ ] Check-in system (QR scanner)
- [ ] Review & rating system
- [ ] Analytics dashboard
- [ ] Advanced search & filters
- [ ] Certificate generation
- [ ] Event recommendations

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Using Docker

```bash
# Build image
docker build -t nesavent-backend .

# Run container
docker run -p 5000:5000 --env-file .env nesavent-backend
```

### Using Railway/Render

1. Connect your repository
2. Set environment variables
3. Deploy automatically on push

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Support

For support, email support@nesavent.com or create an issue on GitHub.

## 🔄 Changelog

### Version 1.0.0 (Current)
- Initial release with core features
- Full authentication system
- Event management
- Registration & ticketing
- Payment integration
- Email notifications

---

**Built with ❤️ by Nesavent Team**
