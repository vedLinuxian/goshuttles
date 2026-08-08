"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Clock, CheckCircle2, ArrowRight, ArrowLeft, User, Phone, Ticket, AlertTriangle, Lock } from "lucide-react";
import { lockSeatAction, createBookingAction } from "./actions";

interface Seat {
  id: string;
  seatNumber: string;
  seatType: string;
  price: number;
  status: string;
  lockedAt?: Date | string | null;
  lockedUntil?: string | null;
}

interface Trip {
  id: string;
  startTime: Date | string;
  source: { name: string };
  destination: { name: string };
  vehicle: { regNumber: string; modelName: string };
  driver?: { name: string | null } | null;
  seats: Seat[];
}

interface BookingWizardProps {
  trip: Trip;
  userId: string;
  userName: string;
  userPhone: string;
  initialSelectedSeatNumber?: string;
}

export function BookingWizard({
  trip,
  userId,
  userName,
  userPhone,
  initialSelectedSeatNumber,
}: BookingWizardProps) {
  const router = useRouter();

  // Wizard Step: 1 = Pick Seat, 2 = Passenger Details & Lock, 3 = Payment & Pass
  const initialSeat = trip.seats.find((s) => s.seatNumber === initialSelectedSeatNumber && s.status === "AVAILABLE");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(initialSeat || null);
  const [step, setStep] = useState<1 | 2 | 3>(initialSeat ? 2 : 1);

  // Passenger Form State
  const [passengerName, setPassengerName] = useState(userName || "");
  const [passengerPhone, setPassengerPhone] = useState(userPhone || "");
  const [guestAge, setGuestAge] = useState<string>("25");
  const [guestGender, setGuestGender] = useState<string>("Male");

  // Payment State
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE">("ONLINE");
  const [utrNumber, setUtrNumber] = useState("");

  // Lock Timer
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Countdown timer for Step 2 and 3
  useEffect(() => {
    if (!lockedUntil || step === 1) return;
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      setLockTimeRemaining(remaining);
      if (remaining === 0) {
        setLockedUntil(null);
        setErrorMsg("Seat lock time expired. Please select a seat again.");
        setStep(1);
      }
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil, step]);

  const handleSelectSeat = (seat: Seat) => {
    if (seat.status !== "AVAILABLE") return;
    setSelectedSeat(seat);
    setErrorMsg(null);
  };

  const handleProceedToStep2 = () => {
    if (!selectedSeat) {
      setErrorMsg("Please select an available seat to proceed.");
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleLockAndProceedToStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) return;
    if (!passengerName || !passengerPhone) {
      setErrorMsg("Passenger name and phone number are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Call Lock Seat Server Action
    const res = await lockSeatAction(trip.id, selectedSeat.seatNumber);
    setIsSubmitting(false);

    if (res.success && res.lockedUntil) {
      setLockedUntil(res.lockedUntil);
      setStep(3);
    } else {
      setSelectedSeat(null);
      setErrorMsg(res.error || "That seat is no longer available. Availability refreshed; please choose another seat.");
      setStep(1);
      router.refresh();
    }
  };

  const handleConfirmFinalBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) return;
    if (paymentMode === "ONLINE" && !utrNumber) {
      setErrorMsg("Please enter your 12-digit UPI / UTR Transaction ID.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createBookingAction({
      tripId: trip.id,
      seatNumber: selectedSeat.seatNumber,
      paymentMode,
      passengerName,
      passengerPhone,
      guestAge: Number(guestAge) || 25,
      guestGender,
      utrNumber: paymentMode === "ONLINE" ? utrNumber : undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      router.push(`/passenger/booking/${res.bookingId}`);
    } else {
      setErrorMsg(res.error || "Booking transaction failed. Please try again.");
    }
  };

  const minutes = Math.floor(lockTimeRemaining / 60);
  const seconds = lockTimeRemaining % 60;
  const formattedTimer = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Wizard Progress Bar Header */}
      <div className="bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {trip.source.name} → {trip.destination.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Departure: {new Date(trip.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              &nbsp;•&nbsp; Vehicle: <span className="font-mono font-bold text-amber-500">{trip.vehicle.regNumber}</span>
            </p>
          </div>

          {step > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl text-xs font-bold shrink-0">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>Seat Lock Expires in: <span className="font-mono text-sm">{formattedTimer}</span></span>
            </div>
          )}
        </div>

        {/* 3 Step Indicator */}
        <div className="grid grid-cols-3 gap-2 pt-4">
          <div className={`p-3 rounded-xl border text-center transition-all ${
            step === 1 ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md" : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 font-semibold"
          }`}>
            <span className="text-xs">Step 1: Choose Seat</span>
          </div>
          <div className={`p-3 rounded-xl border text-center transition-all ${
            step === 2 ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md" : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 font-semibold"
          }`}>
            <span className="text-xs">Step 2: Lock &amp; Details</span>
          </div>
          <div className={`p-3 rounded-xl border text-center transition-all ${
            step === 3 ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md" : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 font-semibold"
          }`}>
            <span className="text-xs">Step 3: Payment &amp; Pass</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: INTERACTIVE COCKPIT SEAT SELECTOR */}
      {step === 1 && (
        <div className="bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Step 1: Select Your Preferred Seat
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Click an available seat below. You can change your selection before proceeding.
              </p>
            </div>
            {selectedSeat && (
              <button
                onClick={handleProceedToStep2}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center gap-2 cursor-pointer"
              >
                Proceed with Seat {selectedSeat.seatNumber} (₹{Number(selectedSeat.price)}) <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Seat Layout HUD */}
          <div className="max-w-md mx-auto bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800/80 space-y-6">
            {/* Legend */}
            <div className="flex justify-center gap-4 text-[11px] font-semibold text-slate-400 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-900 border border-slate-700" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-800 opacity-50" /> Taken</span>
            </div>

            {/* Front Row */}
            <div>
              <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mb-3">Front Cockpit Row</p>
              <div className="flex justify-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 flex flex-col items-center justify-center text-[10px] font-bold">
                  DRIVER
                </div>
                {trip.seats.filter((s) => s.seatType === "FRONT").map((seat) => {
                  const isAvail = seat.status === "AVAILABLE";
                  const isChosen = selectedSeat?.id === seat.id;

                  let styles = "bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed";
                  if (isChosen) styles = "bg-amber-500 border-amber-400 text-slate-950 font-black scale-105 shadow-lg shadow-amber-500/30";
                  else if (isAvail) styles = "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer hover:-translate-y-0.5";

                  return (
                    <div
                      key={seat.id}
                      onClick={() => handleSelectSeat(seat)}
                      className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center border transition-all ${styles}`}
                    >
                      <span className="text-xs font-mono font-extrabold">{seat.seatNumber}</span>
                      <span className="text-[10px] font-bold mt-0.5">{isChosen ? "SELECTED" : isAvail ? `₹${Number(seat.price)}` : "BOOKED"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Middle Row */}
            <div>
              <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mb-3">Middle Row</p>
              <div className="flex justify-center gap-4">
                {trip.seats.filter((s) => s.seatType === "MIDDLE").map((seat) => {
                  const isAvail = seat.status === "AVAILABLE";
                  const isChosen = selectedSeat?.id === seat.id;

                  let styles = "bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed";
                  if (isChosen) styles = "bg-amber-500 border-amber-400 text-slate-950 font-black scale-105 shadow-lg shadow-amber-500/30";
                  else if (isAvail) styles = "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer hover:-translate-y-0.5";

                  return (
                    <div
                      key={seat.id}
                      onClick={() => handleSelectSeat(seat)}
                      className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center border transition-all ${styles}`}
                    >
                      <span className="text-xs font-mono font-extrabold">{seat.seatNumber}</span>
                      <span className="text-[10px] font-bold mt-0.5">{isChosen ? "SELECTED" : isAvail ? `₹${Number(seat.price)}` : "BOOKED"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Back Row */}
            <div>
              <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mb-3">Rear Row</p>
              <div className="flex justify-center gap-4">
                {trip.seats.filter((s) => s.seatType === "BACK").map((seat) => {
                  const isAvail = seat.status === "AVAILABLE";
                  const isChosen = selectedSeat?.id === seat.id;

                  let styles = "bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed";
                  if (isChosen) styles = "bg-amber-500 border-amber-400 text-slate-950 font-black scale-105 shadow-lg shadow-amber-500/30";
                  else if (isAvail) styles = "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer hover:-translate-y-0.5";

                  return (
                    <div
                      key={seat.id}
                      onClick={() => handleSelectSeat(seat)}
                      className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center border transition-all ${styles}`}
                    >
                      <span className="text-xs font-mono font-extrabold">{seat.seatNumber}</span>
                      <span className="text-[10px] font-bold mt-0.5">{isChosen ? "SELECTED" : isAvail ? `₹${Number(seat.price)}` : "BOOKED"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PASSENGER DETAILS & ATOMIC LOCK */}
      {step === 2 && selectedSeat && (
        <div className="bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Step 2: Passenger Details &amp; Lock Reservation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Reserving Seat <span className="font-mono font-bold text-amber-500">{selectedSeat.seatNumber}</span> (₹{Number(selectedSeat.price)})
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Change Seat
            </button>
          </div>

          <form onSubmit={handleLockAndProceedToStep3} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Passenger Full Name</label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  required
                  placeholder="Enter passenger name"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Phone Number</label>
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  required
                  placeholder="10-digit phone number"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Age</label>
                <input
                  type="number"
                  value={guestAge}
                  onChange={(e) => setGuestAge(e.target.value)}
                  min={1}
                  max={120}
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gender</label>
                <select
                  value={guestGender}
                  onChange={(e) => setGuestGender(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                {isSubmitting ? "Locking Seat..." : "Lock Seat & Continue to Payment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: PAYMENT METHOD & TICKET PASS GENERATION */}
      {step === 3 && selectedSeat && (
        <div className="bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800/80">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Step 3: Select Payment Method &amp; Generate Boarding Pass
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Seat <span className="font-mono font-bold text-amber-500">{selectedSeat.seatNumber}</span> is locked for your booking. Total Fare: <span className="font-bold text-white">₹{Number(selectedSeat.price)}</span>
            </p>
          </div>

          <form onSubmit={handleConfirmFinalBooking} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setPaymentMode("ONLINE")}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  paymentMode === "ONLINE"
                    ? "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-lg shadow-amber-500/10"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-extrabold">Instant Online UPI Payment</p>
                  {paymentMode === "ONLINE" && <CheckCircle2 className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="text-[11px] text-slate-500">Pay via GooglePay / PhonePe / Paytm and enter 12-digit UTR for instant pass generation.</p>
              </div>

              <div
                onClick={() => setPaymentMode("CASH")}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  paymentMode === "CASH"
                    ? "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-lg shadow-amber-500/10"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-extrabold">Cash on Boarding</p>
                  {paymentMode === "CASH" && <CheckCircle2 className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="text-[11px] text-slate-500">Reserve seat now and pay cash directly to the driver at departure time.</p>
              </div>
            </div>

            {paymentMode === "ONLINE" ? (
              <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Official Platform UPI VPA</p>
                    <p className="font-mono text-sm font-black text-slate-900 dark:text-white mt-0.5">goshuttles@upi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Amount Payable</p>
                    <p className="text-base font-black text-amber-600 dark:text-amber-400">₹{Number(selectedSeat.price)}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">12-Digit UTR / Transaction Ref ID</label>
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">* Mandatory Field</span>
                  </div>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                    required
                    placeholder="Enter 12-digit UTR from GPay / PhonePe / Paytm"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-white dark:bg-[#060911] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <p className="text-[10px] text-slate-500">
                    Find the 12-digit UTR / UPI Ref ID in your payment app under transaction details.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Cash on Boarding Policy
                </p>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  Your seat <span className="font-mono font-bold text-amber-500">{selectedSeat.seatNumber}</span> will be reserved. Please hand over cash (₹{Number(selectedSeat.price)}) directly to the shuttle driver at boarding time. Uncollected cash holds automatically expire 60 minutes prior to trip departure.
                </p>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Ticket className="h-4 w-4" />
                {isSubmitting ? "Issuing Ticket Pass..." : "Confirm & Issue Boarding Pass"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
