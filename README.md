# Online Reseller

A full-stack marketplace application similar to OLX, built with Next.js, Prisma, MongoDB, and Socket.io for real-time messaging.

## Features

- 🔍 **Product Browsing**: Search and filter products without login
- 👤 **User Authentication**: Secure sign up and sign in with NextAuth
- 📦 **Product Management**: Create, edit, and delete product listings
- 🖼️ **Image Storage**: GridFS for storing product images in MongoDB
- ❤️ **Wishlist**: Save favorite products
- 💬 **Real-time Messaging**: WebSocket-based chat between buyers and sellers
- 🛒 **Orders**: Mock checkout and order management
- 📱 **Responsive Design**: Modern, mobile-friendly UI

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Prisma ORM
- **Image Storage**: GridFS (MongoDB)
- **Authentication**: NextAuth.js (Credentials provider)
- **Real-time**: Socket.io
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Docker (optional, for containerized setup)

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd online-reseller
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` and update the values:
   ```env
   MONGO_URL=mongodb://localhost:27017/online-reseller
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   ```

4. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

5. **Push database schema**
   ```bash
   npm run prisma:push
   ```

6. **Seed the database (optional)**
   ```bash
   npm run seed
   ```
   This creates 3 sample users, 10 products, sample messages, and orders.
   - Users: `alice@example.com`, `bob@example.com`, `charlie@example.com`
   - Password for all: `password123`

7. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Setup

1. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Update `.env` with your values.

2. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - MongoDB on port 27017
   - Next.js app on port 3000

3. **Initialize database**
   ```bash
   docker-compose exec app npm run prisma:push
   docker-compose exec app npm run seed
   ```

4. **Access the application**
   - App: http://localhost:3000
   - MongoDB: localhost:27017

## Project Structure

```
online-reseller/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── api/               # API routes
│   ├── dashboard/         # User dashboard pages
│   ├── products/          # Product pages
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Utilities
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # NextAuth config
│   ├── gridfs.ts         # GridFS utilities
│   └── socket.ts         # Socket.io setup
├── prisma/
│   └── schema.prisma     # Database schema
├── scripts/
│   └── seed.ts           # Database seeding
├── server.js             # Custom server for Socket.io
└── docker-compose.yml    # Docker configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Products
- `GET /api/products` - List products (with search, filter, pagination)
- `GET /api/products/[id]` - Get product details
- `POST /api/products` - Create product (requires auth)
- `PUT /api/products/[id]` - Update product (requires auth, seller only)
- `DELETE /api/products/[id]` - Delete product (requires auth, seller only)

### Images
- `POST /api/uploads/product` - Upload product images (requires auth)
- `GET /api/images/[id]` - Get image by GridFS ID

### Wishlist
- `GET /api/wishlist` - Get user's wishlist (requires auth)
- `POST /api/wishlist/[productId]` - Toggle wishlist item (requires auth)

### Messages
- `GET /api/messages?otherUserId=...` - Get messages with a user (requires auth)
- WebSocket events: `joinRoom`, `sendMessage`, `newMessage`

### Orders
- `GET /api/orders` - Get user's orders (requires auth)
- `POST /api/orders/checkout` - Create order (requires auth)

## WebSocket Events

### Client → Server
- `joinRoom({ otherUserId })` - Join a chat room
- `sendMessage({ toUserId, productId?, content })` - Send a message

### Server → Client
- `newMessage` - Receive a new message
- `messageNotification` - Notification for new message

## Database Schema

### User
- id, name, email, password, wishlist[], createdAt, updatedAt

### Product
- id, title, description, price, sellerId, images[], category, location, condition, isActive, views, wishCount, createdAt, updatedAt

### Message
- id, fromUserId, toUserId, productId?, content, read, createdAt

### Order
- id, buyerId, sellerId, productIds[], total, status, createdAt

## Seeding

The seed script creates:
- 3 users with password `password123`
- 10 sample products across different categories
- Sample messages between users
- Sample orders

Run with: `npm run seed`

## Development

### Prisma Studio
View and edit database data:
```bash
npm run prisma:studio
```

### Environment Variables
Required variables:
- `MONGO_URL` - MongoDB connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - Secret for JWT signing
- `NEXT_PUBLIC_SOCKET_URL` - Socket.io server URL (optional)

## Production Build

```bash
npm run build
npm start
```

Or with Docker:
```bash
docker-compose up -d
```

## CI/CD

GitHub Actions workflow runs on push/PR:
- Install dependencies
- Run linter
- Run tests
- Build application
- Docker build

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Server-side session validation
- Input validation with Zod
- File type and size validation for uploads
- Rate limiting ready (can be added)

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
