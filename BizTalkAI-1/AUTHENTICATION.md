# Authentication System

This document describes the authentication system implemented for BizTalkAI, which supports both Google OAuth and mobile number OTP authentication.

## Features

- **Google OAuth Login**: Users can sign in using their Google accounts
- **Mobile OTP Authentication**: Users can sign in using their phone number with SMS OTP verification
- **User Profile Management**: Users can update their profile information
- **JWT Token Authentication**: Secure token-based authentication
- **Database Integration**: Uses the existing `auth_user` table

## Database Schema

The authentication system uses the `auth_user` table with the following structure:

```sql
CREATE TABLE auth_user (
  id INT(11) PRIMARY KEY AUTO_INCREMENT,
  password VARCHAR(128) NOT NULL,
  last_login DATETIME(6),
  is_superuser TINYINT(1) NOT NULL,
  username VARCHAR(150) NOT NULL,
  first_name VARCHAR(150) NOT NULL,
  last_name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone_number VARCHAR(15),
  is_staff TINYINT(1) NOT NULL,
  is_active TINYINT(1) NOT NULL,
  date_joined DATETIME(6) NOT NULL
);
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# JWT Secret for Authentication
JWT_SECRET=your_jwt_secret_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here

# Twilio Configuration for SMS OTP
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# Frontend Google Client ID (for client-side Google Sign-In)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Database Configuration (existing)
DB_HOST=billsphere.com
DB_USER=dulto726fxeg
DB_PASSWORD=your_database_password_here
DB_NAME=csvfiles
DB_PORT=3306
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### 1. Send OTP
- **POST** `/api/auth/send-otp`
- **Body**: `{ "phoneNumber": "+1234567890" }`
- **Response**: `{ "success": true, "message": "OTP sent successfully" }`

#### 2. Verify OTP
- **POST** `/api/auth/verify-otp`
- **Body**: `{ "phoneNumber": "+1234567890", "otp": "123456" }`
- **Response**: 
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "user",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890"
  }
}
```

#### 3. Google Login
- **POST** `/api/auth/google-login`
- **Body**: `{ "idToken": "google_id_token" }`
- **Response**: Same as OTP verification

#### 4. Get Profile
- **GET** `/api/auth/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User profile information

#### 5. Update Profile
- **PUT** `/api/auth/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "firstName": "John", "lastName": "Doe", "phoneNumber": "+1234567890" }`
- **Response**: Updated user profile

## Frontend Components

### 1. LoginPage (`/client/src/pages/LoginPage.tsx`)
- Handles both mobile OTP and Google OAuth login
- Two-step process: phone number → OTP verification
- Google Sign-In button integration

### 2. AuthContext (`/client/src/contexts/AuthContext.tsx`)
- Manages authentication state
- Provides login, logout, and user update functions
- Persists authentication state in localStorage

### 3. ProtectedRoute (`/client/src/components/ProtectedRoute.tsx`)
- Wraps protected components
- Redirects unauthenticated users to login page
- Shows loading state during authentication check

### 4. UserProfile (`/client/src/components/UserProfile.tsx`)
- Displays and allows editing of user profile
- Shows user information and login history
- Provides logout functionality

## How It Works

### Mobile OTP Flow
1. User enters phone number
2. System sends 6-digit OTP to phone via SMS (Twilio)
3. User enters OTP code
4. System verifies OTP and creates/updates user
5. JWT token is generated and returned

### Google OAuth Flow
1. User clicks Google Sign-In button
2. Google authentication popup appears
3. User authenticates with Google
4. Google returns ID token
5. Backend verifies token with Google
6. User is created/updated in database
7. JWT token is generated and returned

### User Creation/Update Logic
- **For OTP users**: Creates user with phone number, default username, and empty password
- **For Google users**: Creates user with Google profile information
- **Existing users**: Updates last login and profile information
- **Phone number**: Primary identifier for OTP users, can be updated via profile management

## Security Features

- JWT tokens with configurable expiration (default: 7 days)
- OTP expiration (10 minutes)
- Secure password hashing (using existing auth_user table structure)
- CORS protection
- Input validation and sanitization

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install google-auth-library jsonwebtoken twilio @types/jsonwebtoken
   ```

2. **Configure Environment Variables**:
   - Copy `env.example` to `.env`
   - Fill in your Google OAuth credentials (both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`)
   - Configure Twilio settings for SMS OTP

3. **Google OAuth Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add your domain to authorized origins

4. **Twilio Setup** (for SMS OTP):
   - Sign up for a Twilio account
   - Get your Account SID and Auth Token from the console
   - Purchase a phone number for sending SMS
   - Use these credentials in your environment variables

5. **Start the Application**:
   ```bash
   npm run dev
   ```

## Usage

1. Navigate to `/login` to access the login page
2. Choose between mobile OTP or Google OAuth
3. For mobile OTP: Enter phone number → Check SMS → Enter OTP
4. For Google: Click Google Sign-In button → Authenticate
5. After successful login, you'll be redirected to the main application
6. Use the profile button to manage your account

## Troubleshooting

### Common Issues

1. **Google Sign-In not working**:
   - Check `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` are set
   - Verify domain is added to Google OAuth credentials
   - Check browser console for errors

2. **SMS OTP not sending**:
   - Verify Twilio credentials
   - Check Twilio account balance
   - Ensure phone number is in correct format with country code
   - **Region restriction (Error 21408)**: Twilio trial accounts have restrictions on international SMS. The system will automatically fall back to console logging for development.

3. **Database connection issues**:
   - Verify database credentials
   - Check if `auth_user` table exists
   - Ensure database user has proper permissions

4. **JWT token issues**:
   - Check `JWT_SECRET` is set
   - Verify token expiration settings
   - Clear localStorage if tokens are corrupted

### Development Mode
When Twilio credentials are missing or region restrictions apply, the system automatically falls back to console logging:
- OTP codes are displayed in the server console
- Frontend shows "OTP sent to server console! Check your server logs for the code."
- This allows development and testing without SMS costs

## File Structure

```
server/
├── auth.ts              # Authentication service
├── authRoutes.ts        # Authentication API routes
└── routes.ts           # Main routes (includes auth routes)

client/src/
├── pages/
│   └── LoginPage.tsx   # Login page component
├── components/
│   ├── ProtectedRoute.tsx  # Route protection
│   └── UserProfile.tsx     # User profile management
└── contexts/
    └── AuthContext.tsx     # Authentication context

shared/
└── schema.ts           # Database schemas (includes auth_user)
```
