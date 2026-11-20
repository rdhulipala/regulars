// Core booking rules, ported 1:1 from the interactive prototype's in-memory
// logic (see slotted.html: taken(), waits(), promote()). Keeping this as a
// standalone module — not scattered across API routes — means the rules
// stay in one place and are the same for the provider and client surfaces.

import { prisma } from "./db";
import { isLocked } from "./time";

export class BookingError extends Error {}

/** How many confirmed (non-waitlisted, non-cancelled) seats a slot has taken. */
export async function seatsTaken(slotId: string): Promise<number> {
  return prisma.booking.count({ where: { slotId, status: "booked" } });
}

/**
 * Book a single client into a single slot. Falls back to the waitlist if
 * the slot is full. Runs inside a transaction so two clients racing for the
 * last seat can't both get "booked" — the loser is correctly waitlisted.
 */
export async function bookSlot(slotId: string, clientId: string) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUniqueOrThrow({ where: { id: slotId } });
    const taken = await tx.booking.count({ where: { slotId, status: "booked" } });
    const status = taken < slot.capacity ? "booked" : "waitlisted";
    return tx.booking.upsert({
      where: { slotId_clientId: { slotId, clientId } },
      update: { status },
      create: { slotId, clientId, status }
    });
  });
}

/** Book several slots at once (the prototype's "Book all" sticky bar). */
export async function bookSlots(slotIds: string[], clientId: string) {
  const results = [];
  for (const slotId of slotIds) {
    results.push(await bookSlot(slotId, clientId));
  }
  const booked = results.filter((r) => r.status === "booked").length;
  const waitlisted = results.length - booked;
  return { booked, waitlisted, results };
}

/**
 * Cancel a booking and, if it freed a confirmed seat, promote the next
 * person on the waitlist (FIFO by createdAt). Returns who (if anyone) got
 * promoted, so the caller can send them a notification.
 */
export async function cancelBooking(bookingId: string, opts: { enforceCutoff?: boolean } = {}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { slot: true }
    });

    if (opts.enforceCutoff && booking.status === "booked") {
      const provider = await tx.provider.findUniqueOrThrow({ where: { id: booking.slot.providerId } });
      if (isLocked(booking.slot.startsAt, provider.cancelCutoffHours)) {
        throw new BookingError("Past the cancellation cutoff for this slot.");
      }
    }

    const wasBooked = booking.status === "booked";
    await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });

    if (!wasBooked) return { promoted: null };

    const next = await tx.booking.findFirst({
      where: { slotId: booking.slotId, status: "waitlisted" },
      orderBy: { createdAt: "asc" }
    });
    if (next) {
      await tx.booking.update({ where: { id: next.id }, data: { status: "booked" } });
      return { promoted: next };
    }
    return { promoted: null };
  });
}

/**
 * Move a booking to a different slot (must be in the same week — the
 * prototype restricts reschedules to slots the provider has already
 * confirmed). If the destination is full, the client keeps their original
 * seat and joins the destination's waitlist instead.
 */
export async function rescheduleBooking(bookingId: string, toSlotId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { slot: true }
    });
    const provider = await tx.provider.findUniqueOrThrow({ where: { id: booking.slot.providerId } });
    if (isLocked(booking.slot.startsAt, provider.reschedCutoffHours)) {
      throw new BookingError("Past the reschedule cutoff for this slot.");
    }

    const to = await tx.slot.findUniqueOrThrow({ where: { id: toSlotId } });
    if (to.weekId !== booking.slot.weekId) {
      throw new BookingError("Can only reschedule within the same published week.");
    }

    const takenAtDest = await tx.booking.count({ where: { slotId: toSlotId, status: "booked" } });
    const destFull = takenAtDest >= to.capacity;

    if (destFull) {
      // Keep the original seat; just add a waitlist entry at the new slot.
      return tx.booking.upsert({
        where: { slotId_clientId: { slotId: toSlotId, clientId: booking.clientId } },
        update: { status: "waitlisted" },
        create: { slotId: toSlotId, clientId: booking.clientId, status: "waitlisted" }
      });
    }

    // Free the old seat (and promote its waitlist), then take the new one.
    const moved = await tx.booking.update({
      where: { id: bookingId },
      data: { slotId: toSlotId }
    });
    const next = await tx.booking.findFirst({
      where: { slotId: booking.slotId, status: "waitlisted" },
      orderBy: { createdAt: "asc" }
    });
    if (next) await tx.booking.update({ where: { id: next.id }, data: { status: "booked" } });

    return moved;
  });
}

/** Publish a draft week. Clients can only see/book slots in published weeks. */
export async function publishWeek(weekId: string) {
  return prisma.week.update({
    where: { id: weekId },
    data: { status: "published", publishedAt: new Date() }
  });
}

/** Raise/lower a slot's capacity; promotes waitlisted clients if seats open up. */
export async function setSlotCapacity(slotId: string, capacity: number) {
  return prisma.$transaction(async (tx) => {
    await tx.slot.update({ where: { id: slotId }, data: { capacity } });
    // Promote as many waitlisted clients as the new capacity allows.
    // Loop is bounded by capacity, which is always a small number.
    for (let i = 0; i < capacity; i++) {
      const taken = await tx.booking.count({ where: { slotId, status: "booked" } });
      if (taken >= capacity) break;
      const next = await tx.booking.findFirst({
        where: { slotId, status: "waitlisted" },
        orderBy: { createdAt: "asc" }
      });
      if (!next) break;
      await tx.booking.update({ where: { id: next.id }, data: { status: "booked" } });
    }
  });
}
