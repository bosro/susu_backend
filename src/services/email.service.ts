// src/services/email.service.ts
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: Transporter;

  /**
   * Initialize email transporter
   */
  private static getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });
    }

    return this.transporter;
  }

  /**
   * Send email
   */
  private static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = this.getTransporter();

      const mailOptions = {
        from: `"${config.email.fromName}" <${config.email.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const info = await transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    userName?: string
  ): Promise<void> {
    const subject = 'Reset Your Password';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 20px;
              font-size: 16px;
              color: #555;
            }
            .greeting {
              font-size: 18px;
              font-weight: 500;
              color: #333;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
            .info-box {
              background-color: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 0;
              font-size: 14px;
              color: #666;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              font-size: 14px;
              color: #777;
            }
            .footer p {
              margin: 5px 0;
            }
            .link {
              color: #667eea;
              text-decoration: none;
              word-break: break-all;
            }
            .warning {
              color: #e74c3c;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            
            <div class="content">
              ${userName ? `<p class="greeting">Hello ${userName},</p>` : '<p class="greeting">Hello,</p>'}
              
              <p>We received a request to reset the password for your account. If you didn't make this request, you can safely ignore this email.</p>
              
              <p>To reset your password, click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="info-box">
                <p><strong>⏰ This link will expire in 1 hour.</strong></p>
                <p>For security reasons, this password reset link is only valid for 60 minutes.</p>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}" class="link">${resetUrl}</a></p>
              
              <p class="warning">⚠️ If you didn't request a password reset, please secure your account immediately by changing your password.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(
    email: string,
    userName: string,
    companyName: string
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
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 20px;
              font-size: 16px;
              color: #555;
            }
            .greeting {
              font-size: 20px;
              font-weight: 600;
              color: #333;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
            }
            .features {
              background-color: #f8f9fa;
              padding: 20px;
              margin: 20px 0;
              border-radius: 6px;
            }
            .features h3 {
              margin-top: 0;
              color: #667eea;
            }
            .features ul {
              margin: 0;
              padding-left: 20px;
            }
            .features li {
              margin: 10px 0;
              color: #555;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              font-size: 14px;
              color: #777;
            }
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
              
              <p>Your account has been successfully created and is now active. You can start managing your susu collections right away.</p>
              
              <div style="text-align: center;">
                <a href="${config.frontendUrl}/auth/login" class="button">Get Started</a>
              </div>
              
              <div class="features">
                <h3>What you can do:</h3>
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

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send company approval notification
   */
  static async sendCompanyApprovedEmail(
    email: string,
    userName: string,
    companyName: string
  ): Promise<void> {
    const subject = 'Your Company Account Has Been Approved!';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: #ffffff;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 20px;
              font-size: 16px;
              color: #555;
            }
            .greeting {
              font-size: 18px;
              font-weight: 500;
              color: #333;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
            }
            .success-icon {
              font-size: 48px;
              text-align: center;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              font-size: 14px;
              color: #777;
            }
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

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send company suspension notification
   */
  static async sendCompanySuspendedEmail(
    email: string,
    userName: string,
    companyName: string,
    reason?: string
  ): Promise<void> {
    const subject = 'Important: Your Account Has Been Suspended';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: #ffffff;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 20px;
              font-size: 16px;
              color: #555;
            }
            .greeting {
              font-size: 18px;
              font-weight: 500;
              color: #333;
              margin-bottom: 20px;
            }
            .warning-box {
              background-color: #fef2f2;
              border-left: 4px solid #ef4444;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              font-size: 14px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Account Suspended</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${userName},</p>
              
              <p>Your company account <strong>${companyName}</strong> has been suspended.</p>
              
              ${reason ? `
                <div class="warning-box">
                  <strong>Reason:</strong> ${reason}
                </div>
              ` : ''}
              
              <p>This means you currently cannot access your account or use the platform's features.</p>
              
              <p>If you believe this is a mistake or would like to appeal this decision, please contact our support team immediately.</p>
              
              <p><strong>Support Email:</strong> ${config.email.support || config.email.from}</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Susu Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Send OTP email (for future use)
   */
  static async sendOTPEmail(
    email: string,
    otp: string,
    expiryMinutes: number = 10
  ): Promise<void> {
    const subject = 'Your Verification Code';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Code</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              padding: 40px 20px;
              text-align: center;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .otp-code {
              font-size: 48px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #667eea;
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
              display: inline-block;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              font-size: 14px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verification Code</h1>
            </div>
            
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

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Verify email configuration
   */
  static async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log('✅ Email service is ready to send emails');
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error);
      return false;
    }
  }
}