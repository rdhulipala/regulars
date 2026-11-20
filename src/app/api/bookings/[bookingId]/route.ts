import { NextResponse } from "next/server";
import { cancelBooking, rescheduleBooking, BookingError } from "@/lib/booking";

// PATCH { toSlotId } — reschedule within the same week.
export async function PATCH(req: Request, { params }: { params: { bookingId: string } }) {
  const { toSlotId } = await req.json();
  try {
    const booking = await rescheduleBooking(params.bookingId, toSlotId);
    return NextResponse.json(booking);
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}

// DELETE — cancel (client-initiated cancels enforce the provider's cutoff;
// the provider dashboard calls this with ?force=1 to override).
export async function DELETE(req: Request, { params }: { params: { bookingId: string } }) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  try {
    const result = await cancelBooking(params.bookingId, { enforceCutoff: !force });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
