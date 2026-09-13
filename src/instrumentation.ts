/**
 * Penjadwal internal — berjalan bersama server aplikasi.
 * Memproses antrean & pengingat WhatsApp secara berkala tanpa cron eksternal.
 *
 * Untuk produksi skala besar, tetap disarankan memanggil
 * GET /api/cron/reminders?secret=CRON_SECRET dari cron server.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as { __sipanduScheduler?: NodeJS.Timeout };
  if (g.__sipanduScheduler) return;

  const { runScheduler } = await import("./lib/scheduler");
  const { prisma } = await import("./lib/prisma");

  const INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_MINUTES ?? 30) * 60 * 1000;

  // Jeda awal agar server siap & koneksi basis data stabil
  setTimeout(async () => {
    try {
      const profile = await prisma.rwProfile.findFirst();
      if (!profile?.waAutoSend) return;
      const report = await runScheduler();
      if (report.trashReminders || report.activityReminders) {
        console.log(
          `[scheduler] ${report.trashReminders} pengingat iuran, ${report.activityReminders} pengingat kegiatan, ${report.delivery.sent} pesan terkirim`,
        );
      }
    } catch (err) {
      console.error("[scheduler] gagal pada siklus pertama:", err);
    }
  }, 30_000);

  g.__sipanduScheduler = setInterval(async () => {
    try {
      const report = await runScheduler();
      if (report.trashReminders || report.activityReminders || report.delivery.processed) {
        console.log(
          `[scheduler] ${report.trashReminders} pengingat iuran · ${report.activityReminders} pengingat kegiatan · ${report.delivery.sent} terkirim · ${report.delivery.failed} gagal`,
        );
      }
    } catch (err) {
      console.error("[scheduler] error:", err);
    }
  }, INTERVAL_MS);
}
