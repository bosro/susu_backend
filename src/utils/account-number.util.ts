// src/utils/account-number.util.ts
export class AccountNumberUtil {
  static generate(prefix: string = 'SUS'): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
  }

  static generateReference(prefix: string = 'TXN'): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}