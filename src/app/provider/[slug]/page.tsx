import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { startOfWeek, addDays } from "@/lib/time";
import ProviderBoard from "@/components/ProviderBoard";

export default async function ProviderPage({ params }: { params: { slug: string } }) {
  const provider = await prisma.provider.findUnique({ where: { slug: params.slug } });
  if (!provider) notFound();

  // Ensure the current and next two weeks exist as drafts so the dashboard
  // always has something to show, mirroring the prototype's 3-week board.
  const monday = startOfWeek(new Date());
  const weekStarts = [0, 1, 2].map((i) => addDays(monday, i * 7));
  await Promise.all(
    weekStarts.map((startDate) =>
      prisma.week.upsert({
        where: { providerId_startDate: { providerId: provider.id, startDate } },
        update: {},
        create: { providerId: provider.id, startDate, status: "draft" }
      })
    )
  );

  const weeks = await prisma.week.findMany({
    where: { providerId: provider.id, startDate: { gte: monday } },
    orderBy: { startDate: "asc" },
    take: 3,
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

  const slotTypes = await prisma.slotType.findMany({ where: { providerId: provider.id } });

  return <ProviderBoard provider={provider} weeks={weeks} slotTypes={slotTypes} />;
}
