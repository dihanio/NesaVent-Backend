# NesaVent Backend API

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red.svg)](https://redis.io/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)

Complete production-ready RESTful API backend for **NesaVent** - Modern Campus Event Management & Ticketing Platform. Built with TypeScript, Express.js, MongoDB, and Redis for high performance and scalability.

## 📖 Table of Contents

- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Key Features](#-key-features)
- [Security Features](#-security-features)
- [Database Models](#-database-models)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## 🛠️ Tech Stack

**Core Technologies:**
- **Runtime**: Node.js 22.x
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database**: MongoDB 8.x with Mongoose ODM
- **Cache**: Redis 7.x for session & data caching

**Key Libraries & Services:**
- **Authentication**: JWT (jsonwebtoken), bcrypt
- **Validation**: Zod schemas
- **Email**: Resend API
- **Payment**: Midtrans Snap API
- **File Upload**: Cloudinary
- **PDF Generation**: PDFKit
- **QR Code**: qrcode library with AES-256 encryption
- **Logging**: Winston + Morgan
- **Error Tracking**: Sentry
- **Job Scheduling**: node-cron
- **Security**: Helmet, express-rate-limit, cors
- **Process Manager**: PM2 (production)

**Development Tools:**
- **Package Manager**: npm/pnpm
- **Code Quality**: ESLint, Prettier
- **API Testing**: Postman/Insomnia recommended

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

## ✨ Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication (access + refresh tokens)
- Role-based access control (Admin, Organization, Student, User)
- Email verification system with token expiry
- Password reset via email
- Session management with Redis
- Organization verification workflow
- Rate limiting per user/IP

### 🎪 Event Management
- Complete CRUD operations for events
- Multi-ticket type support (paid/free)
- Event approval workflow (Draft → Pending → Approved → Published)
- Event status management (Published, Cancelled, Completed)
- Advanced search & filtering (category, city, date, price, venue type)
- Event statistics (views, shares, registrations, revenue)
- Featured events system
- Multiple venue types (Offline, Online, Hybrid)
- Rich event details (gallery, FAQ, requirements, terms)
- Automatic slug generation

### 🎟️ Registration & Ticketing
- Multi-ticket type booking
- Real-time quota management
- Payment integration with Midtrans
- Automatic payment verification
- QR code generation for tickets
- E-ticket PDF generation
- Ticket download functionality
- Check-in system with QR scanning
- Registration status tracking
- Payment expiry handling (30 minutes)

### 💳 Payment Gateway
- Midtrans integration (Snap API)
- Multiple payment channels support
- Automatic payment verification webhook
- Payment status tracking
- Revenue analytics
- Refund handling (for cancelled events)

### 📧 Notification System
- Email notifications via Resend API
- Registration confirmation emails
- Payment success notifications
- Event reminder emails (automated job)
- Admin approval notifications
- Event cancellation notifications
- Ticket delivery via email

### 💬 Review & Rating
- User reviews for completed events
- Star rating system (1-5)
- Organizer response system
- Review moderation
- Review statistics calculation

### 📊 Analytics & Reporting
- Daily analytics aggregation (cron job)
- Event performance metrics
- Revenue tracking
- User demographics
- Registration trends
- Popular events tracking
- Category statistics

### 🗂️ Category Management
- Dynamic category system
- Category-based filtering
- Category statistics
- Icon support for categories

### 🔔 Real-time Notifications
- In-app notification system
- Notification preferences
- Mark as read/unread
- Notification history

### 📁 File Management
- Cloudinary integration for image uploads
- Image optimization
- Multiple file upload support
- Event poster & gallery management

### 🛡️ Security Features
- Input validation with Zod schemas
- XSS protection
- SQL/NoSQL injection prevention
- CORS configuration
- Helmet security headers
- Encrypted QR codes (AES-256)
- Rate limiting (Express Rate Limit)
- Request sanitization
- Error handling middleware
- Winston logger integration
- Sentry error tracking

### ⚡ Performance Optimization
- Redis caching for frequently accessed data
- Database query optimization
- Pagination support
- Index optimization for search queries
- Connection pooling
- Response compression

### 🤖 Automated Jobs
- **Payment Job**: Check expired payments every 5 minutes
- **Reminder Job**: Send event reminders (1 day before)
- **Analytics Job**: Aggregate daily statistics
- **Maintenance Job**: Clean up expired sessions/tokens

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

### Environment-Specific Configurations

**Development:**
```bash
npm run dev
# Server runs on http://localhost:5000
# Hot reload enabled with nodemon
```

**Production:**
```bash
npm run build
npm start
# Or use PM2 for process management
pm2 start dist/server.js --name nesavent-api
```

### Using Docker

1. **Build Docker Image:**
```bash
docker build -t nesavent-backend:latest .
```

2. **Run Container:**
```bash
docker run -d \
  --name nesavent-api \
  -p 5000:5000 \
  --env-file .env \
  --restart unless-stopped \
  nesavent-backend:latest
```

3. **With Docker Compose:**
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
  
  mongodb:
    image: mongo:8.0
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongodb_data:
```

### Cloud Deployment

#### Railway
1. Connect GitHub repository
2. Create new project from repo
3. Add environment variables in dashboard
4. Deploy automatically on push to main branch

#### Render
1. New Web Service → Connect repository
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Add environment variables
5. Auto-deploy enabled by default

#### VPS/Dedicated Server
1. Install Node.js 22.x, MongoDB 8.x, Redis 7.x
2. Clone repository
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Setup PM2:
```bash
pm2 start dist/server.js --name nesavent-api
pm2 startup
pm2 save
```
6. Configure Nginx reverse proxy
7. Setup SSL with Let's Encrypt

### Environment Variables Checklist

Before deploying, ensure these variables are set:
- [x] `NODE_ENV=production`
- [x] `PORT=5000`
- [x] `MONGODB_URI` (MongoDB connection string)
- [x] `REDIS_URL` (Redis connection string)
- [x] `JWT_ACCESS_SECRET` (Strong random string)
- [x] `JWT_REFRESH_SECRET` (Strong random string)
- [x] `ENCRYPTION_KEY` (32-character string for QR encryption)
- [x] `RESEND_API_KEY` (Email service)
- [x] `CLOUDINARY_*` (Image upload service)
- [x] `MIDTRANS_*` (Payment gateway)
- [x] `FRONTEND_URL` (CORS configuration)
- [x] `SENTRY_DSN` (Error tracking - optional)

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

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/AmazingFeature`
3. **Commit your changes**: `git commit -m 'Add some AmazingFeature'`
4. **Push to the branch**: `git push origin feature/AmazingFeature`
5. **Open a Pull Request**

### Code Style
- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation when needed

### Pull Request Guidelines
- Describe changes in detail
- Reference related issues
- Add screenshots for UI changes
- Ensure tests pass
- Update README if needed

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature request? Please create an issue on GitHub:

**Bug Report Template:**
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

**Feature Request Template:**
- Feature description
- Use case / problem it solves
- Proposed implementation (optional)
- Additional context

## 👥 Support & Community

- **GitHub Issues**: [Report bugs or request features](https://github.com/dihanio/NesaVent-Backend/issues)
- **Documentation**: See API documentation above
- **Email**: support@nesavent.com (if available)

## 🔄 Changelog

### Version 1.0.0 (January 2025)
**Initial Release - Core Features**
- ✅ Complete authentication system with JWT
- ✅ Role-based access control (Admin, Organization, Student, User)
- ✅ Email verification workflow
- ✅ Event management (CRUD + approval workflow)
- ✅ Multi-ticket type system
- ✅ Registration & booking system
- ✅ Payment gateway integration (Midtrans)
- ✅ QR code generation for tickets
- ✅ E-ticket PDF generation
- ✅ Email notification system (Resend)
- ✅ File upload with Cloudinary
- ✅ Redis caching implementation
- ✅ Rate limiting & security features
- ✅ Admin dashboard APIs
- ✅ Analytics & reporting
- ✅ Review & rating system
- ✅ Check-in system
- ✅ Category management
- ✅ Automated cron jobs
- ✅ Comprehensive logging & error tracking

## 🗺️ Roadmap

### Version 1.1.0 (Q1 2025)
- [ ] WhatsApp notification integration
- [ ] Advanced analytics dashboard
- [ ] Event recommendations engine
- [ ] Export reports (Excel/PDF)
- [ ] Bulk ticket operations
- [ ] Multi-language support (i18n)

### Version 1.2.0 (Q2 2025)
- [ ] Certificate generation system
- [ ] Live streaming integration
- [ ] Event collaboration features
- [ ] Advanced search with Elasticsearch
- [ ] Social media integration
- [ ] Mobile app API enhancements

### Version 2.0.0 (Future)
- [ ] GraphQL API support
- [ ] Microservices architecture
- [ ] Real-time collaboration
- [ ] AI-powered features
- [ ] Advanced security features
- [ ] Performance optimization

## 📊 Project Statistics

- **Total Files**: 62+
- **Total Lines**: 24,000+
- **API Endpoints**: 50+
- **Database Models**: 8
- **Services**: 10+
- **Automated Jobs**: 4
- **Languages**: TypeScript (100%)

## 🙏 Acknowledgments

- **Express.js** - Fast, unopinionated web framework
- **MongoDB** - Flexible document database
- **Redis** - In-memory data structure store
- **Midtrans** - Payment gateway solution
- **Resend** - Modern email API
- **Cloudinary** - Image & video management
- All open-source contributors

## 📞 Contact

- **GitHub**: [@dihanio](https://github.com/dihanio)
- **Repository**: [NesaVent-Backend](https://github.com/dihanio/NesaVent-Backend)
- **Frontend Repository**: [NesaVent-Frontend](https://github.com/dihanio/NesaVent-Frontend)

---

**⭐ If you find this project useful, please consider giving it a star!**

**Built with ❤️ by NesaVent Team**
