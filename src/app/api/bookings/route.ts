import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bookSlots } from "@/lib/booking";

// POST { providerId, clientName, clientPhone, slotIds: string[] }
// Client self-serve booking: look up or create the client record by phone,
// then book every selected slot (batch booking from the prototype's
// "Book all" flow).
export async function POST(req: Request) {
  const { providerId, clientName, clientPhone, slotIds } = await req.json();

  const client = await prisma.client.upsert({
    where: { providerId_phone: { providerId, phone: clientPhone } },
    update: { name: clientName },
    create: { providerId, name: clientName, phone: clientPhone }
  });

  const result = await bookSlots(slotIds, client.id);
  return NextResponse.json({ clientId: client.id, ...result });
}
