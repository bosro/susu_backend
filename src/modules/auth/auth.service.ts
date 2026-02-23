// src/modules/auth/auth.service.ts
import { prisma } from "../../config/database";
import { BcryptUtil } from "../../utils/bcrypt.util";
import { JWTUtil } from "../../utils/jwt.util";
import { AuditLogUtil } from "../../utils/audit-log.util";
import { UserRole, CompanyStatus, AuditAction } from "../../types/enums";
import { ITokenPayload } from "../../types/interfaces";
import { EmailService } from "../../services/email.service";
import crypto from "crypto";

export class AuthService {
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });
      console.log(`✅ Cleaned up ${result.count} expired refresh tokens`);
      return result.count;
    } catch (error) {
      console.error("❌ Token cleanup failed:", error);
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
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const existingCompany = await prisma.company.findUnique({
      where: { email: data.companyEmail },
    });
    if (existingCompany) {
      throw new Error("Company with this email already exists");
    }

    const hashedPassword = await BcryptUtil.hash(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          email: data.companyEmail,
          phone: data.companyPhone,
          address: data.companyAddress,
          status: CompanyStatus.PENDING,
        },
      });

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
          companyId: true,
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

    // ✅ Send welcome email to new company admin
    EmailService.sendWelcomeEmail(
      result.user.email,
      `${result.user.firstName} ${result.user.lastName}`,
      result.company.name,
    ).catch((error) => {
      console.error("⚠️ Failed to send welcome email:", error);
    });

    // ✅ Notify all super admins about the new company registration
    this.notifySuperAdminsOfNewCompany(
      result.company.name,
      result.company.email,
      `${result.user.firstName} ${result.user.lastName}`,
      new Date(),
    ).catch((error) => {
      console.error("⚠️ Failed to notify super admins of new company:", error);
    });

    const tokenPayload: ITokenPayload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
      companyId: result.user.companyId,
      branchId: null,
    };

    const accessToken = JWTUtil.generateAccessToken(tokenPayload);
    const refreshToken = JWTUtil.generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    console.log("✅ Registration successful for:", result.user.email);

    return {
      user: result.user,
      tokens: { accessToken, refreshToken },
    };
  }

  // ✅ Helper: notify all super admins when a new company registers
  private async notifySuperAdminsOfNewCompany(
    companyName: string,
    companyEmail: string,
    adminName: string,
    registeredAt: Date,
  ): Promise<void> {
    const superAdmins = await prisma.user.findMany({
      where: {
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
      select: { email: true },
    });

    if (superAdmins.length === 0) {
      console.log("⚠️ No active super admins found to notify");
      return;
    }

    await Promise.allSettled(
      superAdmins.map((admin) =>
        EmailService.sendSuperAdminNewCompanyAlert(
          admin.email,
          companyName,
          companyEmail,
          adminName,
          registeredAt,
        ),
      ),
    );

    console.log(
      `✅ Notified ${superAdmins.length} super admin(s) of new company registration`,
    );
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    console.log("🔍 Login attempt for email:", email);

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
        themeMode: true,
        themeColor: true,
        customPrimary: true,
        customSecondary: true,
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
        assignedBranches: {
          select: {
            id: true,
            branchId: true,
            branch: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.log("❌ User not found");
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      console.log("❌ Account is inactive");
      throw new Error(
        "Account is inactive. Please contact your administrator.",
      );
    }

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.company?.status !== CompanyStatus.ACTIVE
    ) {
      console.log("❌ Company account is not active:", user.company?.status);
      throw new Error("Company account is not active. Please contact support.");
    }

    const isPasswordValid = await BcryptUtil.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("❌ Invalid password");
      throw new Error("Invalid credentials");
    }

    const tokenPayload: ITokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      companyId: user.companyId,
      branchId: null,
    };

    const accessToken = JWTUtil.generateAccessToken(tokenPayload);
    const refreshToken = JWTUtil.generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    if (user.companyId) {
      await AuditLogUtil.log({
        companyId: user.companyId,
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: "USER",
        entityId: user.id,
        ipAddress,
        userAgent,
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    console.log("✅ Login successful for:", userWithoutPassword.email);

    return {
      user: userWithoutPassword,
      tokens: { accessToken, refreshToken },
    };
  }

  async refreshToken(refreshToken: string) {
    let decoded: ITokenPayload;
    try {
      decoded = JWTUtil.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error("Invalid refresh token");
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            company: {
              select: { id: true, name: true, status: true },
            },
          },
        },
      },
    });

    if (!storedToken) throw new Error("Refresh token not found");
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error("Refresh token expired");
    }
    if (!storedToken.user.isActive) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error("User account is inactive");
    }
    if (
      storedToken.user.role !== UserRole.SUPER_ADMIN &&
      storedToken.user.company?.status !== CompanyStatus.ACTIVE
    ) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error("Company account is no longer active");
    }

    const tokenPayload: ITokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId,
      branchId: null,
    };

    const newAccessToken = JWTUtil.generateAccessToken(tokenPayload);
    const newRefreshToken = JWTUtil.generateRefreshToken(tokenPayload);

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

    console.log("✅ Token refreshed successfully for user:", decoded.email);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });
    console.log("✅ User logged out:", userId);
    return { message: "Logged out successfully" };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const isPasswordValid = await BcryptUtil.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) throw new Error("Current password is incorrect");

    const hashedPassword = await BcryptUtil.hash(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.refreshToken.deleteMany({ where: { userId } });
    console.log("✅ Password changed for user:", user.email);
    return { message: "Password changed successfully" };
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
        themeMode: true,
        themeColor: true,
        customPrimary: true,
        customSecondary: true,
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
        assignedBranches: {
          select: {
            id: true,
            branchId: true,
            branch: {
              select: { id: true, name: true, address: true },
            },
          },
        },
      },
    });

    if (!user) throw new Error("User not found");
    return user;
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string },
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
        companyId: true,
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
        assignedBranches: {
          select: {
            id: true,
            branchId: true,
            branch: {
              select: { id: true, name: true, address: true },
            },
          },
        },
      },
    });

    console.log("✅ Profile updated:", user.email);
    return user;
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: { select: { name: true } } },
    });

    if (!user) {
      console.log("⚠️ Password reset requested for non-existent email:", email);
      return {
        message: "If the email exists, a password reset link has been sent",
      };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: resetTokenHash, resetTokenExpiry } as any,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    const userName = `${user.firstName} ${user.lastName}`;

    // 🔍 Debug logs
    console.log("🔑 Reset token generated for:", user.email);
    console.log("🌐 FRONTEND_URL:", process.env.FRONTEND_URL);
    console.log("🔗 Reset URL:", resetUrl);
    console.log("📧 Attempting to send email to:", user.email);
    console.log("📬 SMTP Config check:", {
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST || "NOT SET",
      port: process.env.EMAIL_PORT || "NOT SET",
      user: process.env.SMTP_USER || process.env.EMAIL_USER || "NOT SET",
      secure: process.env.EMAIL_SECURE || "NOT SET",
    });

    try {
      await EmailService.sendPasswordResetEmail(user.email, resetUrl, userName);
      console.log("✅ Password reset email successfully sent to:", user.email);
    } catch (error: any) {
      console.error("❌ Failed to send password reset email:", error.message);
      console.error("❌ Full SMTP error:", error);
      throw new Error(`Failed to send reset email: ${error.message}`);
    }

    return {
      message: "If the email exists, a password reset link has been sent",
      ...(process.env.NODE_ENV === "development" && { resetToken, resetUrl }),
    };
  }

  async verifyResetToken(data: { token: string }) {
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(data.token)
      .digest("hex");
    const user = await prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: { gt: new Date() },
      } as any,
    });

    if (!user) throw new Error("Invalid or expired reset token");
    console.log("✅ Reset token verified for:", user.email);
    return { valid: true };
  }

  async resetPassword(data: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(data.token)
      .digest("hex");
    const user = await prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: { gt: new Date() },
      } as any,
    });

    if (!user) throw new Error("Invalid or expired reset token");

    const hashedPassword = await BcryptUtil.hash(data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      } as any,
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    console.log("✅ Password reset successfully for:", user.email);
    return { message: "Password reset successfully" };
  }

  async adminResetUserPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const hashedPassword = await BcryptUtil.hash(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    await prisma.refreshToken.deleteMany({ where: { userId } });

    console.log("✅ Admin reset password for user:", user.email);
    return { message: "User password reset successfully" };
  }

  // ✅ NEW: Manually suspend a user account (super admin or company admin)
  async suspendUser(
    targetUserId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
    reason?: string,
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    if (!targetUser) throw new Error("User not found");

    // Prevent suspending super admins
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new Error("Super admin accounts cannot be suspended");
    }

    // Company admins can only suspend users within their own company
    if (
      requestingUserRole === UserRole.COMPANY_ADMIN &&
      targetUser.companyId !==
        (
          await prisma.user.findUnique({
            where: { id: requestingUserId },
            select: { companyId: true },
          })
        )?.companyId
    ) {
      throw new Error("You can only suspend users within your own company");
    }

    if (!targetUser.isActive) {
      throw new Error("User is already suspended");
    }

    // Deactivate the user and invalidate all their tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { isActive: false },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: targetUserId },
      }),
    ]);

    // Send suspension email (fire and forget)
    EmailService.sendUserSuspendedEmail(
      targetUser.email,
      `${targetUser.firstName} ${targetUser.lastName}`,
      reason,
    ).catch((error) => {
      console.error("⚠️ Failed to send suspension email:", error);
    });

    console.log(`✅ User ${targetUser.email} suspended by ${requestingUserId}`);

    return {
      message: `User ${targetUser.firstName} ${targetUser.lastName} has been suspended`,
      userId: targetUserId,
    };
  }

  // ✅ NEW: Manually reactivate a user account
  async reactivateUser(
    targetUserId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        company: { select: { id: true, name: true, status: true } },
      },
    });

    if (!targetUser) throw new Error("User not found");

    // Company admins can only reactivate users within their own company
    if (requestingUserRole === UserRole.COMPANY_ADMIN) {
      const requestingUser = await prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { companyId: true },
      });
      if (targetUser.companyId !== requestingUser?.companyId) {
        throw new Error(
          "You can only reactivate users within your own company",
        );
      }
    }

    // Check if the company itself is active before reactivating the user
    if (
      targetUser.role !== UserRole.SUPER_ADMIN &&
      targetUser.company?.status !== CompanyStatus.ACTIVE
    ) {
      throw new Error(
        `Cannot reactivate user — the company account (${targetUser.company?.name}) is not active. Activate the company first.`,
      );
    }

    if (targetUser.isActive) {
      throw new Error("User is already active");
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: true },
    });

    // Send reactivation email (fire and forget)
    EmailService.sendUserReactivatedEmail(
      targetUser.email,
      `${targetUser.firstName} ${targetUser.lastName}`,
    ).catch((error) => {
      console.error("⚠️ Failed to send reactivation email:", error);
    });

    console.log(
      `✅ User ${targetUser.email} reactivated by ${requestingUserId}`,
    );

    return {
      message: `User ${targetUser.firstName} ${targetUser.lastName} has been reactivated`,
      userId: targetUserId,
    };
  }

  // ✅ NEW: Get user status (active/inactive)
  async getUserStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        role: true,
        company: { select: { id: true, name: true, status: true } },
      },
    });

    if (!user) throw new Error("User not found");
    return user;
  }

  async updateThemePreferences(
    userId: string,
    themeData: {
      themeMode?: "light" | "dark";
      themeColor?: string;
      customPrimary?: string;
      customSecondary?: string;
    },
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
        themeMode: true,
        themeColor: true,
        customPrimary: true,
        customSecondary: true,
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
        assignedBranches: {
          select: {
            id: true,
            branchId: true,
            branch: {
              select: { id: true, name: true, address: true },
            },
          },
        },
      },
    });

    console.log("✅ Theme preferences updated for:", user.email);
    return user;
  }

  async updateTheme(
    userId: string,
    themeData: {
      themeMode?: string;
      themeColor?: string;
      customPrimary?: string | null;
      customSecondary?: string | null;
    },
  ): Promise<any> {
    try {
      const updatedUser = await prisma.user.update({
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
          themeMode: true,
          themeColor: true,
          customPrimary: true,
          customSecondary: true,
        },
      });
      return updatedUser;
    } catch (error: any) {
      throw new Error(`Failed to update theme: ${error.message}`);
    }
  }
}
