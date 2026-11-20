import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publishWeek } from "@/lib/booking";
import { sendSms } from "@/lib/sms";

export async function POST(_req: Request, { params }: { params: { weekId: string } }) {
  const week = await publishWeek(params.weekId);
  const clients = await prisma.client.findMany({ where: { providerId: week.providerId } });
  await Promise.all(
    clients.map((c) =>
      sendSms(c.phone, `Next week's schedule is up. Book your spots: ${process.env.NEXT_PUBLIC_BASE_URL ?? ""}`)
    )
  );
  return NextResponse.json({ week, notified: clients.length });
}
