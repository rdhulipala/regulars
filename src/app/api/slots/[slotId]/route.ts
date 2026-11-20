import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSlotCapacity } from "@/lib/booking";

// PATCH { capacity } — raising capacity auto-promotes the waitlist.
export async function PATCH(req: Request, { params }: { params: { slotId: string } }) {
  const { capacity } = await req.json();
  await setSlotCapacity(params.slotId, capacity);
  return NextResponse.json({ ok: true });
}

// DELETE — remove a slot. Any bookings on it are cascade-deleted (schema).
export async function DELETE(_req: Request, { params }: { params: { slotId: string } }) {
  const removed = await prisma.booking.count({ where: { slotId: params.slotId, status: "booked" } });
  await prisma.slot.delete({ where: { id: params.slotId } });
  return NextResponse.json({ ok: true, displacedBookings: removed });
}
