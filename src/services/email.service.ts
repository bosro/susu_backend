// src/services/email.service.ts
import nodemailer, { Transporter } from "nodemailer";
import { config } from "../config";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: Transporter;

  private static getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });
    }
    return this.transporter;
  }

  private static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = this.getTransporter();
      const mailOptions = {
        from: `"${config.email.fromName}" <${config.email.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""),
      };
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully:", {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      console.error("❌ Email sending failed:", error);
      throw new Error("Failed to send email");
    }
  }

  // ─── PASSWORD RESET ──────────────────────────────────────────────────────────

  static async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    userName?: string,
  ): Promise<void> {
    const subject = "Reset Your Password";
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6;
            color: #111827;
          }
          .wrapper {
            padding: 40px 16px;
          }
          .container {
            max-width: 560px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }

          /* ── Header ── */
          .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            padding: 40px 32px;
            text-align: center;
          }
          .header-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            background: rgba(255,255,255,0.15);
            border-radius: 16px;
            margin-bottom: 16px;
          }
          .header h1 {
            color: #ffffff;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.3px;
          }
          .header p {
            color: rgba(255,255,255,0.75);
            font-size: 14px;
            margin-top: 6px;
          }

          /* ── Body ── */
          .body {
            padding: 36px 32px;
          }
          .greeting {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 12px;
          }
          .body p {
            font-size: 15px;
            color: #6b7280;
            line-height: 1.65;
            margin-bottom: 16px;
          }

          /* ── Button ── */
          .btn-wrapper {
            text-align: center;
            margin: 28px 0;
          }
          .btn {
            display: inline-block;
            padding: 14px 36px;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 15px;
            letter-spacing: 0.2px;
            box-shadow: 0 4px 12px rgba(37,99,235,0.35);
          }

          /* ── Info box ── */
          .info-box {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-left: 4px solid #2563eb;
            border-radius: 10px;
            padding: 16px;
            margin: 24px 0;
          }
          .info-box-icon {
            flex-shrink: 0;
            margin-top: 1px;
          }
          .info-box-text strong {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 4px;
          }
          .info-box-text span {
            font-size: 13px;
            color: #3b82f6;
            line-height: 1.5;
          }

          /* ── Warning box ── */
          .warning-box {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-left: 4px solid #ef4444;
            border-radius: 10px;
            padding: 16px;
            margin: 20px 0;
          }
          .warning-box-text {
            font-size: 13px;
            color: #b91c1c;
            line-height: 1.5;
          }

          /* ── Fallback link ── */
          .fallback {
            font-size: 13px;
            color: #9ca3af;
            margin-top: 8px;
          }
          .fallback a {
            color: #2563eb;
            text-decoration: none;
            word-break: break-all;
            font-size: 12px;
          }

          /* ── Divider ── */
          .divider {
            border: none;
            border-top: 1px solid #f3f4f6;
            margin: 24px 0;
          }

          /* ── Footer ── */
          .footer {
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 24px 32px;
            text-align: center;
          }
          .footer p {
            font-size: 12px;
            color: #9ca3af;
            line-height: 1.6;
          }
          .footer a {
            color: #2563eb;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">

            <!-- Header -->
            <div class="header">
              <div class="header-icon">
                <!-- Lock SVG -->
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C9.23858 2 7 4.23858 7 7V9H6C4.89543 9 4 9.89543 4 11V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V11C20 9.89543 19.1046 9 18 9H17V7C17 4.23858 14.7614 2 12 2ZM15 9H9V7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7V9ZM12 13C12.5523 13 13 13.4477 13 14V17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17V14C11 13.4477 11.4477 13 12 13Z" fill="white"/>
                </svg>
              </div>
              <h1>Password Reset Request</h1>
              <p>Secure link to reset your account password</p>
            </div>

            <!-- Body -->
            <div class="body">
              <p class="greeting">Hello${userName ? ` ${userName}` : ""},</p>
              <p>
                We received a request to reset the password for your account.
                If you didn't make this request, you can safely ignore this email — your password won't change.
              </p>

              <!-- CTA Button -->
              <div class="btn-wrapper">
                <a href="${resetUrl}" class="btn">Reset My Password</a>
              </div>

              <!-- Expiry info -->
              <div class="info-box">
                <div class="info-box-icon">
                  <!-- Clock SVG -->
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4ZM11 6V12.4142L14.2929 15.7071L15.7071 14.2929L13 11.5858V6H11Z" fill="#2563eb"/>
                  </svg>
                </div>
                <div class="info-box-text">
                  <strong>This link expires in 1 hour</strong>
                  <span>For your security, this password reset link is only valid for 60 minutes from when it was sent.</span>
                </div>
              </div>

              <!-- Fallback link -->
              <p class="fallback">
                Button not working? Copy and paste this link into your browser:<br/>
                <a href="${resetUrl}">${resetUrl}</a>
              </p>

              <hr class="divider"/>

              <!-- Warning -->
              <div class="warning-box">
                <div class="info-box-icon">
                  <!-- Shield SVG -->
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L3 6V12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12V6L12 2ZM12 11C11.4477 11 11 10.5523 11 10V8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V10C13 10.5523 12.5523 11 12 11ZM12 15C11.4477 15 11 14.5523 11 14C11 13.4477 11.4477 13 12 13C12.5523 13 13 13.4477 13 14C13 14.5523 12.5523 15 12 15Z" fill="#ef4444"/>
                  </svg>
                </div>
                <p class="warning-box-text">
                  <strong>Didn't request this?</strong> If you didn't request a password reset, please secure your account immediately by changing your password.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>This is an automated message — please do not reply to this email.</p>
              <p style="margin-top: 6px;">
                Need help? Contact us at
                <a href="mailto:${config.email.support}">${config.email.support}</a>
              </p>
              <p style="margin-top: 10px;">© ${new Date().getFullYear()} MS System. All rights reserved.</p>
            </div>

          </div>
        </div>
      </body>
    </html>
  `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── WELCOME EMAIL ───────────────────────────────────────────────────────────

  static async sendWelcomeEmail(
    email: string,
    userName: string,
    companyName: string,
  ): Promise<void> {
    const subject = `Welcome to ${companyName}!`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome!</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 32px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 20px; font-size: 16px; color: #555; }
            .greeting { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 20px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .features { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 6px; }
            .features h3 { margin-top: 0; color: #667eea; }
            .features ul { margin: 0; padding-left: 20px; }
            .features li { margin: 10px 0; color: #555; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome!</h1>
            </div>
            <div class="content">
              <p class="greeting">Hi ${userName},</p>
              <p>Welcome to <strong>${companyName}</strong>! We're excited to have you on board.</p>
              <p>Your account has been successfully created. Our team will review and activate your account shortly. You'll receive a confirmation email once approved.</p>
              <div style="text-align: center;">
                <a href="${config.frontendUrl}/auth/login" class="button">Get Started</a>
              </div>
              <div class="features">
                <h3>What you'll be able to do:</h3>
                <ul>
                  <li>📊 Manage customer accounts and collections</li>
                  <li>💰 Track daily summaries and reports</li>
                  <li>👥 Manage team members and branches</li>
                  <li>📈 View detailed analytics and insights</li>
                </ul>
              </div>
              <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── COMPANY APPROVED ────────────────────────────────────────────────────────

  static async sendCompanyApprovedEmail(
    email: string,
    userName: string,
    companyName: string,
  ): Promise<void> {
    const subject = "Your Company Account Has Been Approved!";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 20px; font-size: 16px; color: #555; }
            .greeting { font-size: 18px; font-weight: 500; color: #333; margin-bottom: 20px; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Account Approved!</h1>
            </div>
            <div class="content">
              <div class="success-icon">🎊</div>
              <p class="greeting">Hi ${userName},</p>
              <p>Great news! Your company account <strong>${companyName}</strong> has been approved and is now fully active.</p>
              <p>You can now access all features of the Susu Management System and start managing your collections.</p>
              <div style="text-align: center;">
                <a href="${config.frontendUrl}/auth/login" class="button">Login to Your Account</a>
              </div>
              <p>Thank you for choosing our platform. We're here to support your success!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── COMPANY SUSPENDED (simple version used by auth service) ────────────────

  static async sendCompanySuspendedEmail(
    email: string,
    userName: string,
    companyName: string,
    reason?: string,
  ): Promise<void> {
    await this.sendAccountSuspendedEmail(email, {
      adminName: userName,
      companyName,
      reason: reason || "No reason provided.",
      contactEmail: (config.email as any).support || config.email.from,
    });
  }

  // ─── ACCOUNT SUSPENDED (used by subscriptions service) ──────────────────────

  static async sendAccountSuspendedEmail(
    email: string,
    data: {
      adminName: string;
      companyName: string;
      reason: string;
      contactEmail: string;
    },
  ): Promise<void> {
    const subject = "Important: Your Account Has Been Suspended";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 20px; font-size: 16px; color: #555; }
            .greeting { font-size: 18px; font-weight: 500; color: #333; margin-bottom: 20px; }
            .warning-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning-box p { margin: 5px 0; font-size: 14px; color: #666; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Account Suspended</h1>
            </div>
            <div class="content">
              <p class="greeting">Hi ${data.adminName},</p>
              <p>Your company account <strong>${data.companyName}</strong> has been suspended.</p>
              <div class="warning-box">
                <p><strong>Reason:</strong> ${data.reason}</p>
              </div>
              <p>This means you currently cannot access your account or use the platform's features.</p>
              <p>If you believe this is a mistake or would like to appeal this decision, please contact our support team immediately.</p>
              <p><strong>Support Email:</strong> ${data.contactEmail}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── ACCOUNT REACTIVATED (used by subscriptions service) ────────────────────

  static async sendAccountReactivatedEmail(
    email: string,
    data: {
      adminName: string;
      companyName: string;
      plan: string;
      expiryDate: Date;
      loginUrl: string;
    },
  ): Promise<void> {
    const subject = "✅ Your Account Has Been Reactivated";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Reactivated</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 20px; font-size: 16px; color: #555; }
            .success-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .success-box p { margin: 6px 0; font-size: 15px; color: #065f46; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Account Reactivated!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.adminName},</p>
              <p>Great news! Your company account <strong>${data.companyName}</strong> has been reactivated and you now have full access to the platform.</p>
              <div class="success-box">
                <p>✅ Your account is now <strong>Active</strong>.</p>
                <p>📋 <strong>Plan:</strong> ${data.plan}</p>
                <p>📅 <strong>Valid Until:</strong> ${data.expiryDate.toLocaleDateString("en-GB", { dateStyle: "full" })}</p>
              </div>
              <p>You can now log in and continue managing your susu collections.</p>
              <div style="text-align: center;">
                <a href="${data.loginUrl}" class="button">Login Now</a>
              </div>
              <p>Thank you for continuing to use our platform!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── USER ACCOUNT REACTIVATED (used by auth service - individual user) ───────

  static async sendUserReactivatedEmail(
    email: string,
    userName: string,
  ): Promise<void> {
    const subject = "✅ Your User Account Has Been Reactivated";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Reactivated</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 20px; font-size: 16px; color: #555; }
            .success-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .success-box p { margin: 0; color: #065f46; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>✅ Account Reactivated!</h1></div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your user account has been reactivated by an administrator. You can now log in and access the platform again.</p>
              <div class="success-box"><p>✅ Your account is now <strong>Active</strong>.</p></div>
              <div style="text-align: center;">
                <a href="${config.frontendUrl}/auth/login" class="button">Login Now</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── USER SUSPENDED (individual user, used by auth service) ─────────────────

  static async sendUserSuspendedEmail(
    email: string,
    userName: string,
    reason?: string,
  ): Promise<void> {
    const subject = "Important: Your User Account Has Been Suspended";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 20px; font-size: 16px; color: #555; }
            .warning-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning-box p { margin: 5px 0; font-size: 14px; color: #666; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>⚠️ Account Suspended</h1></div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your user account has been suspended by an administrator.</p>
              ${reason ? `<div class="warning-box"><p><strong>Reason:</strong> ${reason}</p></div>` : ""}
              <p>You will not be able to log in or access the platform while your account is suspended.</p>
              <p>If you believe this is a mistake, please contact your company admin or our support team.</p>
              <p><strong>Support Email:</strong> ${(config.email as any).support || config.email.from}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── SUBSCRIPTION EXPIRY WARNING (used by subscriptions service) ─────────────

  static async sendSubscriptionExpiryWarning(
    email: string,
    data: {
      adminName: string;
      companyName: string;
      plan: string;
      expiryDate: Date;
      daysLeft: number;
      renewUrl: string;
    },
  ): Promise<void> {
    const subject = `⚠️ Subscription Expiring in ${data.daysLeft} Day${data.daysLeft !== 1 ? "s" : ""} – Action Required`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Expiry Warning</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 26px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 16px; font-size: 16px; color: #555; }
            .countdown { font-size: 64px; font-weight: bold; text-align: center; color: #f59e0b; margin: 10px 0; }
            .countdown-label { text-align: center; color: #777; font-size: 14px; margin-bottom: 20px; }
            .warning-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .warning-box p { margin: 5px 0; font-size: 14px; color: #666; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Subscription Expiry Warning</h1>
            </div>
            <div class="content">
              <div class="countdown">${data.daysLeft}</div>
              <div class="countdown-label">day${data.daysLeft !== 1 ? "s" : ""} remaining</div>
              <p>Hi ${data.adminName},</p>
              <p>Your <strong>${data.plan}</strong> subscription for <strong>${data.companyName}</strong> is expiring soon.</p>
              <div class="warning-box">
                <p><strong>Expiry Date:</strong> ${data.expiryDate.toLocaleDateString("en-GB", { dateStyle: "full" })}</p>
                <p><strong>Action Required:</strong> Renew your subscription to avoid service interruption.</p>
              </div>
              <p>If your subscription expires, your account will be automatically suspended and you will lose access to all platform features.</p>
              <div style="text-align: center;">
                <a href="${data.renewUrl}" class="button">Renew Subscription Now</a>
              </div>
              <p>If you have any questions about your subscription, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── SUPER ADMIN NEW COMPANY ALERT ──────────────────────────────────────────

  static async sendSuperAdminNewCompanyAlert(
    adminEmail: string,
    companyName: string,
    companyEmail: string,
    adminName: string,
    registeredAt: Date,
  ): Promise<void> {
    const subject = `🆕 New Company Registration: ${companyName}`;
    const reviewUrl = `${config.frontendUrl}/super-admin/companies`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Company Registration</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 26px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content p { margin: 0 0 16px; font-size: 16px; color: #555; }
            .details-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .details-box p { margin: 6px 0; font-size: 15px; }
            .details-box strong { color: #333; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>🆕 New Company Registration</h1></div>
            <div class="content">
              <p>A new company has registered and is pending your review and activation.</p>
              <div class="details-box">
                <p><strong>Company Name:</strong> ${companyName}</p>
                <p><strong>Company Email:</strong> ${companyEmail}</p>
                <p><strong>Admin Name:</strong> ${adminName}</p>
                <p><strong>Registered At:</strong> ${registeredAt.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}</p>
                <p><strong>Status:</strong> Pending Approval</p>
              </div>
              <p>Please review this company and activate or reject their account from the admin dashboard.</p>
              <div style="text-align: center;">
                <a href="${reviewUrl}" class="button">Review Companies</a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated notification from Susu Management System.</p>
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: adminEmail, subject, html });
  }

  // ─── OTP EMAIL ───────────────────────────────────────────────────────────────

  static async sendOTPEmail(
    email: string,
    otp: string,
    expiryMinutes: number = 10,
  ): Promise<void> {
    const subject = "Your Verification Code";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; text-align: center; }
            .otp-code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #667eea; background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; display: inline-block; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>🔐 Verification Code</h1></div>
            <div class="content">
              <p>Your verification code is:</p>
              <div class="otp-code">${otp}</div>
              <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
              <p style="color: #e74c3c; font-weight: 500;">⚠️ Do not share this code with anyone.</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail({ to: email, subject, html });
  }

  // ─── VERIFY CONNECTION ───────────────────────────────────────────────────────

  static async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log("✅ Email service is ready to send emails");
      return true;
    } catch (error) {
      console.error("❌ Email service verification failed:", error);
      return false;
    }
  }
}
