import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTicketById } from "@/lib/ticket-service";
import { toPrintableTicketData } from "@/lib/ticket-view-model";
import { PrintableTicket } from "@/components/tickets/printable-ticket";
import { TicketActions } from "@/components/tickets/ticket-actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { ticketId } = await params;
  const ticket = await getTicketById(ticketId);
  const isOwner = ticket?.booking.userId === session.user.id;
  const isAssignedDriver = ticket?.booking.trip.driverId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!ticket || (!isOwner && !isAssignedDriver && !isAdmin)) redirect("/passenger/bookings");

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-12">
      <Link href={isAdmin ? "/admin/tickets" : "/passenger/bookings"} className="no-print inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <PrintableTicket ticket={toPrintableTicketData(ticket)} />
      <TicketActions ticketId={ticket.id} />
    </div>
  );
}
