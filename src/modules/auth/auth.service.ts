// src/modules/auth/auth.service.ts
import { prisma } from '../../config/database';
import { BcryptUtil } from '../../utils/bcrypt.util';
import { JWTUtil } from '../../utils/jwt.util';
import { AuditLogUtil } from '../../utils/audit-log.util';
import { UserRole, CompanyStatus, AuditAction } from '../../types/enums';
import { ITokenPayload } from '../../types/interfaces';

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
          role: true,
          companyId: true,
          company: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
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
    console.log('🔍 Password length:', password.length);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
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
          },
        },
      },
    });

    if (!user) {
      console.log('❌ User not found');
      throw new Error('Invalid credentials');
    }

    console.log('✅ User found:', user.email);
    console.log('🔍 User active status:', user.isActive);
    console.log('🔍 User role:', user.role);
    console.log('🔍 Stored password hash (first 20 chars):', user.password.substring(0, 20));

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
    console.log('🔍 Comparing passwords...');
    console.log('🔍 Plain password:', password);
    console.log('🔍 Hash from DB:', user.password);
    
    const isPasswordValid = await BcryptUtil.compare(password, user.password);
    
    console.log('🔍 Password comparison result:', isPasswordValid);

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

    const { password: _, ...userWithoutPassword } = user;

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
    } catch {
      throw new Error('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new Error('Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('Refresh token expired');
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

    // Invalidate all refresh tokens
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
      },
    });

    return user;
  }
}