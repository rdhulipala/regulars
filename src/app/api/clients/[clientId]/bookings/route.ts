import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { clientId: string } }) {
  const bookings = await prisma.booking.findMany({
    where: { clientId: params.clientId, status: { in: ["booked", "waitlisted"] } },
    include: { slot: { include: { slotType: true } } },
    orderBy: { slot: { startsAt: "asc" } }
  });
  return NextResponse.json(bookings);
}
