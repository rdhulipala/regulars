// Seeds one demo trainer with the same slot pattern as the clickable
// prototype (slotted.html), so the real app and the prototype demo
// the same story: Mon–Sat classes, a published current week with
// realistic fill levels, and a draft next week.

import { PrismaClient } from "@prisma/client";
import { startOfWeek, addDays } from "../src/lib/time";

const prisma = new PrismaClient();

const CLIENTS = ["Priya", "Marcus", "Elena", "Dev", "Sam", "Aisha", "Tom", "Rosa", "Ken", "Lena"];

// [dayOffset, hour, minute, slotTypeKey]
const PATTERN: [number, number, number, string][] = [
  [0, 6, 0, "str"],
  [0, 17, 30, "cal"],
  [1, 6, 0, "legs"],
  [1, 18, 0, "mob"],
  [2, 6, 0, "str"],
  [2, 17, 30, "cal"],
  [3, 6, 0, "legs"],
  [3, 18, 0, "mob"],
  [4, 6, 0, "str"],
  [4, 17, 30, "cal"],
  [5, 8, 0, "legs"],
  [5, 10, 0, "cal"]
];

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

async function main() {
  const provider = await prisma.provider.upsert({
    where: { slug: "coach-maya" },
    update: {},
    create: {
      name: "Coach Maya",
      slug: "coach-maya",
      vertical: "trainer",
      unitLabel: "class",
      reschedCutoffHours: 12,
      cancelCutoffHours: 12
    }
  });

  const typeDefs = [
    { key: "str", name: "Strength", durationMin: 60, defaultCapacity: 8 },
    { key: "legs", name: "Leg day", durationMin: 90, defaultCapacity: 6 },
    { key: "cal", name: "Calisthenics", durationMin: 45, defaultCapacity: 10 },
    { key: "mob", name: "Mobility", durationMin: 45, defaultCapacity: 10 }
  ];

  const types: Record<string, { id: string; defaultCapacity: number }> = {};
  for (const t of typeDefs) {
    const existing = await prisma.slotType.findFirst({ where: { providerId: provider.id, name: t.name } });
    const created =
      existing ??
      (await prisma.slotType.create({
        data: { providerId: provider.id, name: t.name, durationMin: t.durationMin, defaultCapacity: t.defaultCapacity }
      }));
    types[t.key] = { id: created.id, defaultCapacity: t.defaultCapacity };
  }

  const clients = await Promise.all(
    CLIENTS.map((name, i) =>
      prisma.client.upsert({
        where: { providerId_phone: { providerId: provider.id, phone: `+1555000${1000 + i}` } },
        update: {},
        create: { providerId: provider.id, name, phone: `+1555000${1000 + i}` }
      })
    )
  );

  const monday = startOfWeek(new Date());

  // Week 0: published, with realistic fill + a couple of waitlists.
  // Week 1: draft, next Sunday's publish.
  // Week 2: tentative draft, further out.
  for (let w = 0; w < 3; w++) {
    const startDate = addDays(monday, w * 7);
    const week = await prisma.week.upsert({
      where: { providerId_startDate: { providerId: provider.id, startDate } },
      update: { status: w === 0 ? "published" : "draft", publishedAt: w === 0 ? new Date() : null },
      create: {
        providerId: provider.id,
        startDate,
        status: w === 0 ? "published" : "draft",
        publishedAt: w === 0 ? new Date() : null
      }
    });

    for (const [dayOffset, hour, minute, key] of PATTERN) {
      const startsAt = addDays(startDate, dayOffset);
      startsAt.setHours(hour, minute, 0, 0);
      const type = types[key];

      const existingSlot = await prisma.slot.findFirst({ where: { weekId: week.id, startsAt } });
      const slot =
        existingSlot ??
        (await prisma.slot.create({
          data: {
            providerId: provider.id,
            weekId: week.id,
            slotTypeId: type.id,
            startsAt,
            capacity: type.defaultCapacity
          }
        }));

      if (w === 0) {
        // Fill published week 0 to realistic, uneven levels.
        const fillCount = Math.min(clients.length, Math.round(slot.capacity * (0.5 + rnd() * 0.6)));
        const pool = [...clients].sort(() => rnd() - 0.5).slice(0, fillCount + (rnd() > 0.7 ? 2 : 0));
        for (const [i, client] of pool.entries()) {
          await prisma.booking.upsert({
            where: { slotId_clientId: { slotId: slot.id, clientId: client.id } },
            update: {},
            create: { slotId: slot.id, clientId: client.id, status: i < slot.capacity ? "booked" : "waitlisted" }
          });
        }
      }
    }
  }

  console.log(`Seeded provider "coach-maya" with ${clients.length} clients.`);
  console.log(`Dashboard: /provider/coach-maya`);
  console.log(`Client booking page: /book/coach-maya`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
