"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { fmtTime, fmtDuration, fmtDay } from "@/lib/time";

type Booking = { id: string; status: string; client: { id: string; name: string } };
type Slot = {
  id: string;
  startsAt: string;
  capacity: number;
  slotType: { id: string; name: string; durationMin: number };
  bookings: Booking[];
};
type Week = { id: string; startDate: string; status: string; slots: Slot[] };
type SlotType = { id: string; name: string; durationMin: number; defaultCapacity: number };
type Provider = {
  id: string;
  name: string;
  slug: string;
  unitLabel: string;
  reschedCutoffHours: number;
  cancelCutoffHours: number;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ProviderBoard({
  provider,
  weeks,
  slotTypes
}: {
  provider: Provider;
  weeks: Week[];
  slotTypes: SlotType[];
}) {
  const router = useRouter();
  const [weekIdx, setWeekIdx] = useState(0);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const week = weeks[weekIdx];

  const refresh = () => router.refresh();

  async function publish() {
    setBusy(true);
    const res = await fetch(`/api/weeks/${week.id}/publish`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    alert(`Published. Notified ${data.notified} clients.`);
    refresh();
  }

  async function addSlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const day = Number(form.get("day"));
    const time = String(form.get("time"));
    const slotTypeId = String(form.get("slotTypeId"));
    const capacity = Number(form.get("capacity"));
    const start = new Date(week.startDate);
    start.setDate(start.getDate() + day);
    const [h, m] = time.split(":").map(Number);
    start.setHours(h, m, 0, 0);
    await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: provider.id,
        weekId: week.id,
        slotTypeId,
        startsAt: start.toISOString(),
        capacity
      })
    });
    setBusy(false);
    e.currentTarget.reset();
    refresh();
  }

  async function changeCapacity(slotId: string, delta: number, current: number) {
    setBusy(true);
    await fetch(`/api/slots/${slotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacity: Math.max(1, current + delta) })
    });
    setBusy(false);
    refresh();
  }

  async function removeSlot(slotId: string) {
    setBusy(true);
    await fetch(`/api/slots/${slotId}`, { method: "DELETE" });
    setBusy(false);
    setOpenSlot(null);
    refresh();
  }

  const openSlotData = week.slots.find((s) => s.id === openSlot);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{provider.name}&rsquo;s week</h1>
          <p className="text-gray-500">
            {week.status === "published" ? "Live — clients can book these." : "Draft — only you can see this."}
          </p>
        </div>
        <div className="flex gap-2">
          {weeks.map((w, i) => (
            <button
              key={w.id}
              onClick={() => setWeekIdx(i)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                i === weekIdx ? "border-blue-600" : "border-gray-200"
              }`}
            >
              {new Date(w.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              <span className={`ml-2 text-xs ${w.status === "published" ? "text-ok" : "text-gray-400"}`}>
                {w.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {week.status !== "published" && (
        <button
          disabled={busy}
          onClick={publish}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
        >
          Publish this week
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <section className="grid grid-cols-7 gap-2">
          {DAYS.map((d, i) => {
            const daySlots = week.slots.filter((s) => new Date(s.startsAt).getDay() === ((i + 1) % 7));
            return (
              <div key={d} className="bg-gray-50 rounded-xl p-2 min-h-[160px]">
                <div className="font-semibold text-sm mb-2">{d}</div>
                {daySlots.map((s) => {
                  const taken = s.bookings.filter((b) => b.status === "booked").length;
                  const full = taken >= s.capacity;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setOpenSlot(s.id)}
                      className={`w-full text-left bg-white border rounded-lg p-2 mb-2 ${
                        openSlot === s.id ? "ring-2 ring-blue-600" : "border-gray-200"
                      }`}
                    >
                      <div className="font-bold">{fmtTime(new Date(s.startsAt))}</div>
                      <div className="text-xs text-gray-500">
                        {s.slotType.name} · {fmtDuration(s.slotType.durationMin)}
                      </div>
                      <div className="text-xs mt-1">
                        <span className={full ? "text-hot" : ""}>
                          {taken}/{s.capacity} booked
                        </span>
                      </div>
                    </button>
                  );
                })}
                {daySlots.length === 0 && <div className="text-xs text-gray-400">—</div>}
              </div>
            );
          })}
        </section>

        <aside className="space-y-4">
          {openSlotData && (
            <div className="border rounded-xl p-4">
              <h2 className="font-bold">
                {openSlotData.slotType.name} · {fmtDay(new Date(openSlotData.startsAt))}{" "}
                {fmtTime(new Date(openSlotData.startsAt))}
              </h2>
              <div className="flex items-center gap-2 my-2">
                <span className="text-sm">Seats</span>
                <button
                  disabled={busy}
                  onClick={() => changeCapacity(openSlotData.id, -1, openSlotData.capacity)}
                  className="border rounded px-2"
                >
                  −
                </button>
                <b>{openSlotData.capacity}</b>
                <button
                  disabled={busy}
                  onClick={() => changeCapacity(openSlotData.id, 1, openSlotData.capacity)}
                  className="border rounded px-2"
                >
                  +
                </button>
              </div>
              <ul className="text-sm space-y-1">
                {openSlotData.bookings.map((b) => (
                  <li key={b.id} className="flex justify-between border-t pt-1">
                    <span>{b.client.name}</span>
                    <span className={b.status === "waitlisted" ? "text-hot" : "text-ok"}>
                      {b.status === "waitlisted" ? "Waitlist" : "Booked"}
                    </span>
                  </li>
                ))}
                {openSlotData.bookings.length === 0 && <li className="text-gray-400">No bookings yet</li>}
              </ul>
              <button
                disabled={busy}
                onClick={() => removeSlot(openSlotData.id)}
                className="mt-3 text-hot border border-hot rounded-lg px-3 py-1 text-sm"
              >
                Remove this slot
              </button>
            </div>
          )}

          <form onSubmit={addSlot} className="border rounded-xl p-4 space-y-2">
            <h2 className="font-bold">Add a slot to this week</h2>
            <select name="day" className="w-full border rounded p-2">
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <input name="time" type="time" defaultValue="06:00" className="w-full border rounded p-2" />
            <select name="slotTypeId" className="w-full border rounded p-2">
              {slotTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {fmtDuration(t.durationMin)}
                </option>
              ))}
            </select>
            <input
              name="capacity"
              type="number"
              min={1}
              defaultValue={slotTypes[0]?.defaultCapacity ?? 1}
              className="w-full border rounded p-2"
            />
            <button disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 w-full font-semibold">
              Add slot
            </button>
          </form>

          <div className="border rounded-xl p-4 text-sm text-gray-500">
            Public booking link:
            <br />
            <code>/book/{provider.slug}</code>
          </div>
        </aside>
      </div>
    </main>
  );
}
