import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import config from '../config';
import emailService from '../utils/emailService';
import prisma from '../utils/prisma';

// Type assertion to fix Prisma TypeScript issues
const db = prisma as any;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, name, nim } = req.body;

    // Validation
    if (!username || !email || !password || !name) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Check if email exists
    const existingEmail = await db.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }

    // Check if username exists
    const existingUsername = await db.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      res.status(400).json({ message: 'Username already in use' });
      return;
    }

    // Check if NIM exists (if provided)
    if (nim) {
      const existingNim = await db.user.findUnique({
        where: { nim }
      });

      if (existingNim) {
        res.status(400).json({ message: 'NIM already in use' });
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        nim,
        role: 'MAHASISWA'
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        nim: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    // Cari user berdasarkan email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    // A5 – Authentication: Cek apakah akun sedang terkunci
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const secondsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      res.status(429).json({
        message: `Terlalu banyak percobaan gagal. Akun terkunci ${secondsLeft} detik lagi.`,
      });
      return;
    }

    // Cek password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: attempts };

      // Kalau sudah salah 3 kali → kunci 30 detik
      if (attempts >= 3) {
        updateData.lockedUntil = new Date(Date.now() + 30_000); // 30 detik
      }

      await db.user.update({
        where: { id: user.id },
        data: updateData,
      });

      res.status(400).json({
        message: 'Invalid credentials',
        attemptsLeft: attempts >= 3 ? 0 : 3 - attempts,
      });
      return;
    }

    // Login berhasil → reset counter
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Buat token
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwtSecret as Secret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        nim: user.nim,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Gunakan any untuk mengakses property user yang ditambahkan oleh middleware
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        nim: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // If user is a student, include point statistics
    if (user.role === 'MAHASISWA') {
      const approvedActivities = await db.activity.findMany({
        where: {
          userId,
          status: 'APPROVED'
        },
        select: { point: true }
      });

      const totalPoints = approvedActivities.reduce((sum: number, activity: any) => {
        return sum + (activity.point || 0);
      }, 0);

      const TARGET_POINTS = 36;
      const completionPercentage = Math.min((totalPoints / TARGET_POINTS) * 100, 100);

      res.json({
        ...user,
        statistics: {
          totalPoints,
          targetPoints: TARGET_POINTS,
          completionPercentage: Math.round(completionPercentage * 100) / 100,
          remainingPoints: Math.max(TARGET_POINTS - totalPoints, 0),
          isCompleted: totalPoints >= TARGET_POINTS
        }
      });
    } else {
      res.json(user);
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expiry (1 hour from now)
    const resetPasswordExpires = new Date(Date.now() + 3600000);

    // Save token to database
    await db.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken,
        resetPasswordExpires
      }
    });

    // Send password reset email
    try {
      // Check if email service is configured
      const isEmailConfigured = process.env.EMAIL_USER &&
                                process.env.EMAIL_PASSWORD &&
                                process.env.EMAIL_USER !== 'your-brevo-email@domain.com' &&
                                process.env.EMAIL_USER !== 'your-gmail@gmail.com' &&
                                process.env.EMAIL_PASSWORD !== 'your-brevo-smtp-key' &&
                                process.env.EMAIL_PASSWORD !== 'your-gmail-app-password';

      console.log('📧 Email configuration check:', {
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPassword: !!process.env.EMAIL_PASSWORD,
        emailUser: process.env.EMAIL_USER,
        isConfigured: isEmailConfigured
      });

      if (!isEmailConfigured) {
        console.log('📧 Email service not configured, returning token for development');
        res.status(200).json({
          message: 'Email service not configured. Here is your reset token for development:',
          resetToken,
          note: 'Configure EMAIL_USER and EMAIL_PASSWORD in .env to enable email sending'
        });
        return;
      }

      console.log(`📧 Attempting to send password reset email to: ${user.email}`);

      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name
      );

      if (emailSent) {
        console.log(`✅ Password reset email sent successfully to: ${user.email}`);
        res.status(200).json({
          message: 'Password reset link has been sent to your email'
        });
      } else {
        console.error('❌ Failed to send password reset email');
        res.status(200).json({
          message: 'Email service error. Here is your reset token for development:',
          resetToken,
          note: 'Email sending failed, but token is still valid'
        });
      }
    } catch (emailError: any) {
      console.error('❌ Email service error:', emailError);

      // Always provide fallback token for development
      res.status(200).json({
        message: 'Email service error. Here is your reset token for development:',
        resetToken,
        error: emailError?.message || 'Unknown email error',
        note: 'Token is still valid for password reset'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset Password with Token
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      res.status(400).json({
        message: 'Token and new password are required'
      });
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      res.status(400).json({
        message: 'Password must be at least 6 characters long'
      });
      return;
    }

    // Hash the token to compare with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log(`🔍 Looking for user with reset token...`);

    // Find user with valid reset token
    const user = await db.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      console.log('❌ Invalid or expired reset token');
      res.status(400).json({
        message: 'Invalid or expired reset token'
      });
      return;
    }

    console.log(`✅ Valid token found for user: ${user.email}`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    console.log(`✅ Password reset successful for user: ${user.email}`);

    res.status(200).json({
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};