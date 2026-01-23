// src/modules/auth/auth.service.ts - COMPLETE FILE WITH ALL FIXES
import { prisma } from '../../config/database';
import { BcryptUtil } from '../../utils/bcrypt.util';
import { JWTUtil } from '../../utils/jwt.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { UserRole, CompanyStatus, AuditAction } from '../../types/enums';
import { ITokenPayload } from '../../types/interfaces';
import crypto from 'crypto';

export class AuthService {

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      console.log(`✅ Cleaned up ${result.count} expired refresh tokens`);
      return result.count;
    } catch (error) {
      console.error('❌ Token cleanup failed:', error);
      return 0;
    }
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    companyName: string;
    companyEmail: string;
    companyPhone?: string;
    companyAddress?: string;
  }) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if company email already exists
    const existingCompany = await prisma.company.findUnique({
      where: { email: data.companyEmail },
    });

    if (existingCompany) {
      throw new Error('Company with this email already exists');
    }

    // Hash password
    const hashedPassword = await BcryptUtil.hash(data.password);

    // Create company and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          email: data.companyEmail,
          phone: data.companyPhone,
          address: data.companyAddress,
          status: CompanyStatus.PENDING,
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: UserRole.COMPANY_ADMIN,
          companyId: company.id,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          companyId: true,   // ✅ CRITICAL
          branchId: true,    // ✅ CRITICAL
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              logo: true,
              primaryColor: true,
              secondaryColor: true,
            },
          },
        },
      });

      return { user, company };
    });

    // Generate tokens
    const tokenPayload: ITokenPayload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
      companyId: result.user.companyId,
      branchId: null,
    };

    const accessToken = JWTUtil.generateAccessToken(tokenPayload);
    const refreshToken = JWTUtil.generateRefreshToken(tokenPayload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: result.user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    console.log('🔍 Login attempt for email:', email);
    
    // Find user - ✅ USING SELECT INSTEAD OF INCLUDE
     const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      companyId: true,
      branchId: true,
      themeMode: true,        // ✅ Add
      themeColor: true,       // ✅ Add
      customPrimary: true,    // ✅ Add
      customSecondary: true,  // ✅ Add
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          logo: true,
          primaryColor: true,
          secondaryColor: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

    if (!user) {
      console.log('❌ User not found');
      throw new Error('Invalid credentials');
    }

    console.log('✅ User found:', user.email);
    console.log('🔍 User data check:', {
      companyId: user.companyId,
      branchId: user.branchId,
      hasCompany: !!user.company,
    });

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ Account is inactive');
      throw new Error('Account is inactive');
    }

    // Check if company is active (for non-super admins)
    if (user.role !== UserRole.SUPER_ADMIN && user.company?.status !== CompanyStatus.ACTIVE) {
      console.log('❌ Company account is not active:', user.company?.status);
      throw new Error('Company account is not active');
    }

    // Verify password
    const isPasswordValid = await BcryptUtil.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      throw new Error('Invalid credentials');
    }

    console.log('✅ Password valid, generating tokens...');

    // Generate tokens
    const tokenPayload: ITokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      companyId: user.companyId,
      branchId: user.branchId,
    };

    const accessToken = JWTUtil.generateAccessToken(tokenPayload);
    const refreshToken = JWTUtil.generateRefreshToken(tokenPayload);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log audit
    if (user.companyId) {
      await AuditLogUtil.log({
        companyId: user.companyId,
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'USER',
        entityId: user.id,
        ipAddress,
        userAgent,
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    console.log('✅ Login response prepared:', {
      userId: userWithoutPassword.id,
      companyId: userWithoutPassword.companyId,
      branchId: userWithoutPassword.branchId,
    });

    return {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    // Verify refresh token
    let decoded: ITokenPayload;
    try {
      decoded = JWTUtil.verifyRefreshToken(refreshToken);
    } catch (error) {
      console.error('❌ Invalid refresh token:', error);
      throw new Error('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { 
        user: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            }
          }
        } 
      },
    });

    if (!storedToken) {
      console.error('❌ Refresh token not found in database');
      throw new Error('Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      console.error('❌ Refresh token expired');
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('Refresh token expired');
    }

    // Check if user is still active
    if (!storedToken.user.isActive) {
      console.error('❌ User is no longer active');
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('User account is inactive');
    }

    // Check if company is still active (for non-super admins)
    if (storedToken.user.role !== UserRole.SUPER_ADMIN && 
        storedToken.user.company?.status !== CompanyStatus.ACTIVE) {
      console.error('❌ Company is no longer active:', storedToken.user.company?.status);
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('Company account is no longer active');
    }

    // Generate new tokens
    const tokenPayload: ITokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId,
      branchId: decoded.branchId,
    };

    const newAccessToken = JWTUtil.generateAccessToken(tokenPayload);
    const newRefreshToken = JWTUtil.generateRefreshToken(tokenPayload);

    // Delete old refresh token and create new one
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          userId: decoded.userId,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    console.log('✅ Token refreshed successfully for user:', decoded.email);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await BcryptUtil.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await BcryptUtil.hash(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      companyId: true,
      branchId: true,
      themeMode: true,        // ✅ Add
      themeColor: true,       // ✅ Add
      customPrimary: true,    // ✅ Add
      customSecondary: true,  // ✅ Add
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          logo: true,
          primaryColor: true,
          secondaryColor: true,
          status: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,   // ✅ CRITICAL - WAS MISSING
        branchId: true,    // ✅ CRITICAL - WAS MISSING
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            logo: true,
            primaryColor: true,
            secondaryColor: true,
            status: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    console.log('✅ Profile updated:', {
      userId: user.id,
      companyId: user.companyId,
      branchId: user.branchId,
    });

    return user;
  }

  // Password reset methods
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      } as any,
    });

    // TODO: Send email
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    // const userName = `${user.firstName} ${user.lastName}`;

    console.log('🔑 Password reset token generated for:', user.email);
    console.log('🔗 Reset URL:', resetUrl);

    return { 
      message: 'If the email exists, a password reset link has been sent',
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken,
        resetUrl 
      }),
    };
  }

  async verifyResetToken(data: { token: string }) {
    const resetTokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: {
          gt: new Date(),
        },
      } as any,
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    return { valid: true };
  }

  async resetPassword(data: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    const resetTokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: {
          gt: new Date(),
        },
      } as any,
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await BcryptUtil.hash(data.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      } as any,
    });

    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    console.log('✅ Password reset successfully for:', user.email);

    return { message: 'Password reset successfully' };
  }

  async adminResetUserPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await BcryptUtil.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    console.log('✅ Admin reset password for user:', user.email);

    return { message: 'User password reset successfully' };
  }

  async updateThemePreferences(
  userId: string,
  themeData: {
    themeMode?: 'light' | 'dark';
    themeColor?: string;
    customPrimary?: string;
    customSecondary?: string;
  }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      themeMode: themeData.themeMode,
      themeColor: themeData.themeColor,
      customPrimary: themeData.customPrimary,
      customSecondary: themeData.customSecondary,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      companyId: true,
      branchId: true,
      themeMode: true,        // ✅ Include theme
      themeColor: true,       // ✅ Include theme
      customPrimary: true,    // ✅ Include theme
      customSecondary: true,  // ✅ Include theme
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          logo: true,
          primaryColor: true,
          secondaryColor: true,
          status: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

  console.log('✅ Theme preferences updated:', {
    userId: user.id,
    themeMode: user.themeMode,
    themeColor: user.themeColor,
  });

  return user;
}
}