import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { startOfWeek } from "@/lib/time";
import ClientBoard from "@/components/ClientBoard";

export default async function BookPage({ params }: { params: { slug: string } }) {
  const provider = await prisma.provider.findUnique({ where: { slug: params.slug } });
  if (!provider) notFound();

  const monday = startOfWeek(new Date());

  // Clients only ever see published weeks — this is the core rule that
  // lets the provider plan drafts without clients seeing half-set plans.
  const weeks = await prisma.week.findMany({
    where: { providerId: provider.id, status: "published", startDate: { gte: monday } },
    orderBy: { startDate: "asc" },
    include: {
      slots: {
        orderBy: { startsAt: "asc" },
        include: {
          slotType: true,
          bookings: { where: { status: { in: ["booked", "waitlisted"] } }, include: { client: true } }
        }
      }
    }
  });

  return (
    <ClientBoard
      provider={{ id: provider.id, name: provider.name, reschedCutoffHours: provider.reschedCutoffHours, cancelCutoffHours: provider.cancelCutoffHours }}
      weeks={weeks}
    />
  );
}
