import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST { providerId, weekId, slotTypeId, startsAt, capacity }
export async function POST(req: Request) {
  const body = await req.json();
  const slot = await prisma.slot.create({
    data: {
      providerId: body.providerId,
      weekId: body.weekId,
      slotTypeId: body.slotTypeId,
      startsAt: new Date(body.startsAt),
      capacity: body.capacity
    }
  });
  return NextResponse.json(slot);
}
