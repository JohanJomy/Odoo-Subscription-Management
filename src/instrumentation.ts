/**
 * Next.js Instrumentation Hook — registers daily billing cron at startup.
 * Schedule: 02:00 Asia/Kolkata every day. Protected by JOB_SECRET.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: cron } = await import('node-cron');
    const { prisma } = await import('@/lib/prisma');
    const { runHousekeeping, runBilling } = await import('@/server/billing/run');

    cron.schedule(
      '0 2 * * *',
      async () => {
        console.log('[CRON] Daily billing job started at', new Date().toISOString());
        try {
          const today = new Date();
          await runHousekeeping(prisma, today);
          const summary = await runBilling(prisma, today);
          console.log(`[CRON] Done — created: ${summary.created}, skipped: ${summary.skipped}, failed: ${summary.failed}`);
        } catch (err) {
          console.error('[CRON] Daily billing job failed:', err);
        }
      },
      { timezone: 'Asia/Kolkata' }
    );

    console.log('[CRON] Daily billing job scheduled at 02:00 Asia/Kolkata');
  }
}
