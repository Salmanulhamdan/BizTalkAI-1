import { Router } from 'express';
import { authService } from './auth.js';

const router = Router();

// Send OTP to phone number
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number format' 
      });
    }

    const result = await authService.sendOTP(phoneNumber);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'OTP sent successfully' 
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and OTP are required' 
      });
    }

    const result = await authService.verifyOTP(phoneNumber, otp);
    
    if (result.success && result.user) {
      const token = authService.generateToken(result.user);
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phoneNumber: result.user.phoneNumber,
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Google OAuth login
router.post('/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Google ID token is required' 
      });
    }

    const result = await authService.verifyGoogleToken(idToken);
    
    if (result.success && result.user) {
      const token = authService.generateToken(result.user);
      
      res.json({
        success: true,
        message: 'Google login successful',
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phoneNumber: result.user.phoneNumber,
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in google-login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization token required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    const user = await authService.getUserById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        lastLogin: user.lastLogin,
        dateJoined: user.dateJoined,
      }
    });
  } catch (error) {
    console.error('Error in profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update user profile (phone number, etc.)
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization token required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    const { phoneNumber, firstName, lastName } = req.body;
    
    // Update user in database
    const { db } = await import('./storage.js');
    const { authUserTable } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const updateData: any = {};
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    await db
      .update(authUserTable)
      .set(updateData)
      .where(eq(authUserTable.id, decoded.id));

    // Get updated user
    const [updatedUser] = await db
      .select()
      .from(authUserTable)
      .where(eq(authUserTable.id, decoded.id))
      .limit(1);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
      }
    });
  } catch (error) {
    console.error('Error in update profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Logout endpoint (for future token blacklisting if needed)
router.post('/logout', async (req, res) => {
  try {
    // For now, just return success
    // In production, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;
