import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST { providerId, startDate } — get-or-create a draft week for that Monday.
export async function POST(req: Request) {
  const { providerId, startDate } = await req.json();
  const week = await prisma.week.upsert({
    where: { providerId_startDate: { providerId, startDate: new Date(startDate) } },
    update: {},
    create: { providerId, startDate: new Date(startDate), status: "draft" }
  });
  return NextResponse.json(week);
}
