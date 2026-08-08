"use client";

import { useState } from "react";
import { Button, Card, Input, Select, Badge } from "@/components/ui";
import { saveVehicleSeatTemplates } from "@/app/actions/vehicle-pricing-actions";

export function PricingClient({ vehicle, initialSeats }: { vehicle: { id: string; regNumber: string; modelName: string; capacity: number }; initialSeats: { id: string; seatNumber: string; seatType: string; basePrice: string; isActive: boolean }[] }) {
  const [seats, setSeats] = useState(initialSeats);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateSeat(id: string, field: "seatNumber" | "seatType" | "basePrice", value: string) {
    setSeats((current) => current.map((seat) => seat.id === id ? { ...seat, [field]: value } : seat));
  }

  function setAllPrice(value: string) {
    setSeats((current) => current.map((seat) => ({ ...seat, basePrice: value })));
  }

  async function save() {
    setSaving(true); setMessage(null); setError(null);
    const result = await saveVehicleSeatTemplates({ vehicleId: vehicle.id, seats: seats.map(({ seatNumber, seatType, basePrice, isActive }) => ({ seatNumber, seatType, basePrice: Number(basePrice), isActive })) });
    if (result.success) setMessage("Pricing templates saved. Future trips will use the updated fares.");
    else setError(result.error || "Unable to save pricing templates.");
    setSaving(false);
  }

  return <Card variant="glass" className="space-y-5 p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-slate-900 dark:text-white">{vehicle.capacity} seat templates required</p><p className="mt-1 text-[11px] text-slate-500">Configure one active or inactive template per physical seat.</p></div><Badge variant={seats.length === vehicle.capacity ? "success" : "warning"}>{seats.length}/{vehicle.capacity} configured</Badge></div>
    <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Set every fare to</span><Input className="w-32" type="number" min="1" max="10000" placeholder="₹ amount" onChange={(event) => setAllPrice(event.target.value)} /><span className="text-xs text-slate-500">INR</span></div>
    <div className="space-y-3">{seats.map((seat) => <div key={seat.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-[100px_1fr_140px_auto]"><Input aria-label={`${seat.seatNumber} seat number`} value={seat.seatNumber} onChange={(event) => updateSeat(seat.id, "seatNumber", event.target.value)} /><Select aria-label={`${seat.seatNumber} seat type`} value={seat.seatType} onChange={(event) => updateSeat(seat.id, "seatType", event.target.value)}><option value="FRONT">Front</option><option value="MIDDLE">Middle</option><option value="BACK">Back</option></Select><Input aria-label={`${seat.seatNumber} base fare`} type="number" min="1" max="10000" value={seat.basePrice} onChange={(event) => updateSeat(seat.id, "basePrice", event.target.value)} /><Badge variant={seat.isActive ? "success" : "secondary"}>{seat.isActive ? "Active" : "Inactive"}</Badge></div>)}</div>
    {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{message}</p>}
    {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
    <Button type="button" onClick={save} disabled={saving || seats.length !== vehicle.capacity} className="w-full">{saving ? "Saving pricing..." : "Save seat pricing"}</Button>
  </Card>;
}
