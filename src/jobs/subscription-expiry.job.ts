// src/jobs/subscription-expiry.job.ts
// This runs daily to auto-expire subscriptions and send warnings.
// Use with node-cron or your preferred scheduler.

import cron from 'node-cron';
import { SubscriptionsService } from '../modules/subscriptions/subscriptions.service';
import { prisma } from '../config/database';

export function startSubscriptionExpiryJob() {
  const service = new SubscriptionsService();

  // Runs every day at 00:05 AM
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ [CRON] Running daily subscription expiry check...');
    try {
      // Use the first super admin as the actor
      const superAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN', isActive: true },
        select: { id: true },
      });

      if (!superAdmin) {
        console.warn('⚠️ No super admin found for cron job actor');
        return;
      }

      const result = await service.checkAndExpireSubscriptions(superAdmin.id);
      console.log('✅ [CRON] Expiry check result:', result);
    } catch (error) {
      console.error('❌ [CRON] Subscription expiry job failed:', error);
    }
  });

  console.log('✅ Subscription expiry cron job scheduled (daily at 00:05 AM)');
}