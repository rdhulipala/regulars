"use client";

import { useEffect, useState } from "react";
import { fmtTime, fmtDuration, fmtDay, fmtDateTime, isLocked, deadline } from "@/lib/time";

type Booking = { id: string; status: string; client: { id: string; name: string } };
type Slot = {
  id: string;
  startsAt: string;
  capacity: number;
  weekId: string;
  slotType: { id: string; name: string; durationMin: number };
  bookings: Booking[];
};
type Week = { id: string; startDate: string; slots: Slot[] };
type Provider = { id: string; name: string; reschedCutoffHours: number; cancelCutoffHours: number };

type MyBooking = {
  id: string;
  status: string;
  slot: { id: string; startsAt: string; weekId: string; slotType: { name: string } };
};

const STORAGE_KEY = "regulars.client";

export default function ClientBoard({ provider, weeks }: { provider: Provider; weeks: Week[] }) {
  const [weekIdx, setWeekIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [identity, setIdentity] = useState<{ name: string; phone: string; clientId?: string } | null>(null);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setIdentity(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (identity?.clientId) {
      fetch(`/api/clients/${identity.clientId}/bookings`)
        .then((r) => r.json())
        .then(setMyBookings);
    }
  }, [identity?.clientId]);

  if (!identity) return <SignIn onSignIn={setIdentity} providerName={provider.name} />;

  const week = weeks[weekIdx] ?? weeks[0];

  function toggle(slotId: string) {
    const next = new Set(selected);
    next.has(slotId) ? next.delete(slotId) : next.add(slotId);
    setSelected(next);
  }

  async function bookAll() {
    if (!identity) return;
    setBusy(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: provider.id,
        clientName: identity.name,
        clientPhone: identity.phone,
        slotIds: [...selected]
      })
    });
    const data = await res.json();
    const nextIdentity = { ...identity, clientId: data.clientId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdentity));
    setIdentity(nextIdentity);
    setSelected(new Set());
    setBusy(false);
    alert(`Booked ${data.booked}${data.waitlisted ? `, waitlisted ${data.waitlisted}` : ""}.`);
  }

  async function cancel(bookingId: string) {
    setBusy(true);
    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not cancel.");
      return;
    }
    setMyBookings((bs) => bs.filter((b) => b.id !== bookingId));
  }

  if (!week) {
    return (
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-bold">{provider.name}</h1>
        <p className="text-gray-500 mt-2">No weeks are published yet — check back soon.</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Book with {provider.name}</h1>
        <div className="flex gap-2">
          {weeks.map((w, i) => (
            <button
              key={w.id}
              onClick={() => setWeekIdx(i)}
              className={`px-3 py-2 rounded-lg border text-sm ${i === weekIdx ? "border-blue-600" : "border-gray-200"}`}
            >
              {new Date(w.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
            const daySlots = week.slots.filter((s) => new Date(s.startsAt).getDay() === ((i + 1) % 7));
            return (
              <div key={d} className="bg-gray-50 rounded-xl p-2 min-h-[160px]">
                <div className="font-semibold text-sm mb-2">{d}</div>
                {daySlots.map((s) => {
                  const taken = s.bookings.filter((b) => b.status === "booked").length;
                  const full = taken >= s.capacity;
                  const mine = s.bookings.find((b) => b.client.id === identity.clientId);
                  const sel = selected.has(s.id);
                  return (
                    <button
                      key={s.id}
                      disabled={!!mine}
                      onClick={() => toggle(s.id)}
                      className={`w-full text-left bg-white border rounded-lg p-2 mb-2 disabled:opacity-60 ${
                        sel ? "ring-2 ring-blue-600" : "border-gray-200"
                      }`}
                    >
                      <div className="font-bold">{fmtTime(new Date(s.startsAt))}</div>
                      <div className="text-xs text-gray-500">
                        {s.slotType.name} · {fmtDuration(s.slotType.durationMin)}
                      </div>
                      <div className="text-xs mt-1">
                        {mine ? (
                          <span className="text-ok">{mine.status === "waitlisted" ? "Waitlisted" : "Booked"}</span>
                        ) : (
                          <span className={full ? "text-hot" : ""}>{full ? "Full — join waitlist" : `${s.capacity - taken} left`}</span>
                        )}
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
          {selected.size > 0 && (
            <div className="sticky top-4 bg-gray-900 text-white rounded-xl p-3 flex items-center justify-between">
              <span>{selected.size} selected</span>
              <button disabled={busy} onClick={bookAll} className="bg-hot rounded-lg px-3 py-2 font-semibold">
                Book all
              </button>
            </div>
          )}

          <div className="border rounded-xl p-4">
            <h2 className="font-bold mb-2">My upcoming</h2>
            <ul className="text-sm space-y-2">
              {myBookings.map((b) => {
                const start = new Date(b.slot.startsAt);
                const resLocked = isLocked(start, provider.reschedCutoffHours);
                const canLocked = isLocked(start, provider.cancelCutoffHours);
                return (
                  <li key={b.id} className="border-t pt-2">
                    <div className="font-semibold">
                      {b.slot.slotType.name}
                      {b.status === "waitlisted" && <span className="text-hot ml-2">Waitlist</span>}
                    </div>
                    <div className="text-gray-500">{fmtDateTime(start)}</div>
                    <div className={`text-xs ${canLocked ? "text-hot" : "text-gray-400"}`}>
                      {canLocked
                        ? `Locked. Message ${provider.name}.`
                        : `Change by ${fmtDateTime(deadline(start, provider.reschedCutoffHours))}`}
                    </div>
                    <button
                      disabled={busy || (b.status === "booked" && canLocked)}
                      onClick={() => cancel(b.id)}
                      className="text-hot text-xs mt-1 disabled:opacity-40"
                    >
                      {b.status === "waitlisted" ? "Leave waitlist" : "Cancel"}
                    </button>
                  </li>
                );
              })}
              {myBookings.length === 0 && <li className="text-gray-400">Nothing booked yet.</li>}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function SignIn({ onSignIn, providerName }: { onSignIn: (i: { name: string; phone: string }) => void; providerName: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <main className="max-w-sm mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Book with {providerName}</h1>
      <p className="text-gray-500 text-sm">No password needed — just your name and phone number.</p>
      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border rounded p-2"
      />
      <input
        placeholder="Phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border rounded p-2"
      />
      <button
        disabled={!name || !phone}
        onClick={() => {
          const identity = { name, phone };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
          onSignIn(identity);
        }}
        className="bg-blue-600 text-white rounded-lg px-4 py-2 w-full font-semibold disabled:opacity-50"
      >
        Continue
      </button>
    </main>
  );
}
