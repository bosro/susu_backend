-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customPrimary" TEXT,
ADD COLUMN     "customSecondary" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "themeColor" TEXT DEFAULT 'default',
ADD COLUMN     "themeMode" TEXT DEFAULT 'light';
