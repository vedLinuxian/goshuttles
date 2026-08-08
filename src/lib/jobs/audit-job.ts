import { db } from "@/lib/db";
import { issueTicket } from "@/lib/ticket-service";
import { JobExecutionLog, JobResult } from "./types";

export async function runDataIntegrityAuditJob(): Promise<JobResult> {
  const startTime = new Date();
  const logs: JobExecutionLog[] = [];
  const jobId = "data_integrity_audit";
  const name = "Data Integrity & Ticket Audit";

  logs.push({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: "Starting system data integrity audit job",
  });

  try {
    // 1. Generate missing tickets for confirmed bookings
    const confirmedWithoutTickets = await db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        ticket: null,
      },
      include: { seat: true, trip: { include: { source: true, destination: true } }, user: true },
    });

    let ticketsCreated = 0;
    let ticketErrors = 0;
    for (const booking of confirmedWithoutTickets) {
      // Each ticket is issued in its own transaction with collision retry, so a single
      // failure never aborts the whole audit job.
      try {
        await db.$transaction(async (tx) => {
          // Re-check the ticket is still absent inside the transaction (avoid races).
          const existing = await tx.ticket.findUnique({ where: { bookingId: booking.id } });
          if (existing) return;

          await issueTicket(tx, {
            bookingId: booking.id,
            passengerName: booking.user?.name || booking.guestName || "Passenger",
            passengerPhone: booking.user?.phone || null,
            tripDate: booking.trip.startTime,
            source: booking.trip.source.name,
            destination: booking.trip.destination.name,
            seatNumber: booking.seat?.seatNumber || "N/A",
            ticketPrice: Number(booking.totalAmount),
            status: booking.status === "COMPLETED" ? "USED" : "ISSUED",
          });
        });
        ticketsCreated++;
      } catch {
        ticketErrors++;
      }
    }

    if (ticketsCreated > 0) {
      logs.push({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: `Auto-generated ${ticketsCreated} missing QR ticket(s)`,
      });
    }
    if (ticketErrors > 0) {
      logs.push({
        timestamp: new Date().toISOString(),
        level: "WARN",
        message: `Failed to generate ${ticketErrors} ticket(s) (skipped)`,
      });
    }

    // 2. Force lock manifest for departed trips
    const unlockedDeparted = await db.trip.updateMany({
      where: {
        status: { in: ["IN_PROGRESS", "COMPLETED"] },
        manifestLocked: false,
      },
      data: { manifestLocked: true },
    });

    if (unlockedDeparted.count > 0) {
      logs.push({
        timestamp: new Date().toISOString(),
        level: "WARN",
        message: `Force-locked manifest for ${unlockedDeparted.count} departed trip(s)`,
      });
    }

    const endTime = new Date();
    return {
      jobId,
      name,
      status: "SUCCESS",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      processedCount: ticketsCreated + unlockedDeparted.count,
      logs,
      details: { ticketsCreated, ticketErrors, manifestsLocked: unlockedDeparted.count },
    };
  } catch (err: unknown) {
    const endTime = new Date();
    const errorMessage = err instanceof Error ? err.message : String(err);
    logs.push({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message: `Audit job failed: ${errorMessage}`,
    });
    return {
      jobId,
      name,
      status: "FAILED",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      processedCount: 0,
      logs,
      details: { error: errorMessage },
    };
  }
}
