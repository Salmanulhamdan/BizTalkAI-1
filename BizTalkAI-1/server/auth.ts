import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import { db } from './storage.js';
import { authUserTable, type AuthUser, type InsertAuthUser, type UpdateAuthUser } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Twilio configuration for SMS
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

// Initialize Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// OTP storage (in production, use Redis or database)
const otpStorage = new Map<string, { code: string; expires: number; phoneNumber: string }>();

export class AuthService {
  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via SMS
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const otp = this.generateOTP();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store OTP
      otpStorage.set(phoneNumber, { code: otp, expires, phoneNumber });

      // Check if we're in development mode (no Twilio credentials or trial account)
      const isDevelopment = !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER;
      
      if (isDevelopment) {
        // Development mode: log OTP to console instead of sending SMS
        console.log(`\n🔐 DEVELOPMENT MODE - OTP for ${phoneNumber}: ${otp}\n`);
        return { 
          success: true, 
          message: `OTP sent to console (dev mode). Check server logs for code: ${otp}` 
        };
      }

      // Production mode: Send SMS via Twilio
      try {
        await twilioClient.messages.create({
          body: `Your BizTalkAI verification code is: ${otp}. This code will expire in 10 minutes.`,
          from: TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        return { success: true, message: 'OTP sent successfully' };
      } catch (twilioError: any) {
        // If Twilio fails (e.g., region restriction), fall back to console logging
        if (twilioError.code === 21408) {
          console.log(`\n🔐 TWILIO REGION RESTRICTION - OTP for ${phoneNumber}: ${otp}\n`);
          return { 
            success: true, 
            message: `OTP sent to console (Twilio region restricted). Check server logs for code: ${otp}` 
          };
        }
        throw twilioError;
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  // Verify OTP
  async verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    try {
      const storedOTP = otpStorage.get(phoneNumber);
      
      if (!storedOTP) {
        return { success: false, message: 'OTP not found or expired' };
      }

      if (Date.now() > storedOTP.expires) {
        otpStorage.delete(phoneNumber);
        return { success: false, message: 'OTP expired' };
      }

      if (storedOTP.code !== otp) {
        return { success: false, message: 'Invalid OTP' };
      }

      // OTP is valid, find or create user by phone number
      const user = await this.findOrCreateUserByPhone(phoneNumber);
      
      // Clean up OTP
      otpStorage.delete(phoneNumber);

      return { success: true, message: 'OTP verified successfully', user };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: 'Failed to verify OTP' };
    }
  }

  // Google OAuth verification
  async verifyGoogleToken(idToken: string): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return { success: false, message: 'Invalid Google token' };
      }

      const { email, given_name, family_name, name } = payload;
      if (!email) {
        return { success: false, message: 'Email not provided by Google' };
      }

      // Find or create user
      const user = await this.findOrCreateUserByGoogle(email, given_name || '', family_name || '', name || '');

      return { success: true, message: 'Google authentication successful', user };
    } catch (error) {
      console.error('Error verifying Google token:', error);
      return { success: false, message: 'Failed to verify Google token' };
    }
  }

  // Find or create user by phone number (for OTP login)
  private async findOrCreateUserByPhone(phoneNumber: string): Promise<AuthUser> {
    try {
      // Try to find existing user by phone number
      const existingUser = await db
        .select()
        .from(authUserTable)
        .where(eq(authUserTable.phoneNumber, phoneNumber))
        .limit(1);

      if (existingUser.length > 0) {
        // Update last login
        await db
          .update(authUserTable)
          .set({ lastLogin: new Date() })
          .where(eq(authUserTable.id, existingUser[0].id));
        
        // Return user with proper type conversion
        const user = existingUser[0];
        return {
          id: user.id,
          password: user.password,
          lastLogin: user.lastLogin || undefined,
          isSuperuser: user.isSuperuser,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber || undefined,
          isStaff: user.isStaff,
          isActive: user.isActive,
          dateJoined: user.dateJoined,
        };
      }

      // Create new user with default values
      const username = `user_${phoneNumber.replace(/\D/g, '').slice(-6)}`; // Use last 6 digits as username
      const newUser: InsertAuthUser = {
        password: '', // No password for OTP users
        username,
        firstName: 'User',
        lastName: '',
        email: `${username}@biztalkai.local`, // Generate a local email
        phoneNumber: phoneNumber,
        isSuperuser: false,
        isStaff: false,
        isActive: true,
        dateJoined: new Date(),
      };

      await db
        .insert(authUserTable)
        .values(newUser);

      // Get the created user
      const [createdUser] = await db
        .select()
        .from(authUserTable)
        .where(eq(authUserTable.phoneNumber, phoneNumber))
        .limit(1);

      return {
        id: createdUser.id,
        password: createdUser.password,
        lastLogin: createdUser.lastLogin || undefined,
        isSuperuser: createdUser.isSuperuser,
        username: createdUser.username,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        phoneNumber: createdUser.phoneNumber || undefined,
        isStaff: createdUser.isStaff,
        isActive: createdUser.isActive,
        dateJoined: createdUser.dateJoined,
      };
    } catch (error) {
      console.error('Error finding/creating user by phone:', error);
      throw error;
    }
  }

  // Find or create user by email (for Google OAuth)
  private async findOrCreateUserByEmail(email: string): Promise<AuthUser> {
    try {
      // Try to find existing user
      const existingUser = await db
        .select()
        .from(authUserTable)
        .where(eq(authUserTable.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        // Update last login
        await db
          .update(authUserTable)
          .set({ lastLogin: new Date() })
          .where(eq(authUserTable.id, existingUser[0].id));
        
        // Return user with proper type conversion
        const user = existingUser[0];
        return {
          id: user.id,
          password: user.password,
          lastLogin: user.lastLogin || undefined,
          isSuperuser: user.isSuperuser,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber || undefined,
          isStaff: user.isStaff,
          isActive: user.isActive,
          dateJoined: user.dateJoined,
        };
      }

      // Create new user with default values
      const username = email.split('@')[0];
      const newUser: InsertAuthUser = {
        password: '', // No password for OTP users
        username,
        firstName: username,
        lastName: '',
        email,
        phoneNumber: undefined,
        isSuperuser: false,
        isStaff: false,
        isActive: true,
        dateJoined: new Date(),
      };

      await db
        .insert(authUserTable)
        .values(newUser);

      // Get the created user
      const [createdUser] = await db
        .select()
        .from(authUserTable)
        .where(eq(authUserTable.email, email))
        .limit(1);

      return {
        id: createdUser.id,
        password: createdUser.password,
        lastLogin: createdUser.lastLogin || undefined,
        isSuperuser: createdUser.isSuperuser,
        username: createdUser.username,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        phoneNumber: createdUser.phoneNumber || undefined,
        isStaff: createdUser.isStaff,
        isActive: createdUser.isActive,
        dateJoined: createdUser.dateJoined,
      };
    } catch (error) {
      console.error('Error finding/creating user by email:', error);
      throw error;
    }
  }

  // Find or create user by Google OAuth
  private async findOrCreateUserByGoogle(
    email: string, 
    firstName: string, 
    lastName: string, 
    fullName: string
  ): Promise<AuthUser> {
    try {
      // Try to find existing user
      const existingUser = await db
        .select()
        .from(authUserTable)
        .where(eq(authUserTable.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        // Update user details from Google
        await db
          .update(authUserTable)
          .set({
            firstName,
            lastName,
            lastLogin: new Date(),
          })
          .where(eq(authUserTable.id, existingUser[0].id));

        // Return updated user
        const updatedUser = await db
          .select()
          .from(authUserTable)
          .where(eq(authUserTable.id, existingUser[0].id))
          .limit(1);

        const user = updatedUser[0];
        return {
          id: user.id,
          password: user.password,
          lastLogin: user.lastLogin || undefined,
          isSuperuser: user.isSuperuser,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber || undefined,
          isStaff: user.isStaff,
          isActive: user.isActive,
          dateJoined: user.dateJoined,
        };
      }

      // Create new user with Google details
      const username = email.split('@')[0];
      const newUser: InsertAuthUser = {
        password: '', // No password for Google users
        username,
        firstName,
        lastName,
        email,
        phoneNumber: undefined,
        isSuperuser: false,
        isStaff: false,
        isActive: true,
        dateJoined: new Date(),
      };

      await db
        .insert(authUserTable)
        .values(newUser);

      // Get the created user
      const [createdUser] = await db
        .select()
        .from(authUserTable)
        .where(eq(authUserTable.email, email))
        .limit(1);

      return {
        id: createdUser.id,
        password: createdUser.password,
        lastLogin: createdUser.lastLogin || undefined,
        isSuperuser: createdUser.isSuperuser,
        username: createdUser.username,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        phoneNumber: createdUser.phoneNumber || undefined,
        isStaff: createdUser.isStaff,
        isActive: createdUser.isActive,
        dateJoined: createdUser.dateJoined,
      };
    } catch (error) {
      console.error('Error finding/creating user by Google:', error);
      throw error;
    }
  }

  // Generate JWT token
  generateToken(user: AuthUser): string {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Verify JWT token
  verifyToken(token: string): { id: number; email: string; username: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { id: number; email: string; username: string };
    } catch (error) {
      return null;
    }
  }

  // Get user by ID
  async getUserById(id: number): Promise<AuthUser | null> {
    try {
      const users = await db
        .select()
        .from(authUserTable)
        .where(eq(authUserTable.id, id))
        .limit(1);

      if (users.length === 0) return null;
      
      const user = users[0];
      return {
        id: user.id,
        password: user.password,
        lastLogin: user.lastLogin || undefined,
        isSuperuser: user.isSuperuser,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber || undefined,
        isStaff: user.isStaff,
        isActive: user.isActive,
        dateJoined: user.dateJoined,
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
