"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateTimePickerProps {
  value: string; // ISO or datetime-local format: "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & departure time...",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Parse current value or default to now + 2 hours
  const selectedDate = React.useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const [currentMonth, setCurrentMonth] = React.useState(() => selectedDate || new Date());
  const [hour, setHour] = React.useState(() => (selectedDate ? selectedDate.getHours() : 9));
  const [minute, setMinute] = React.useState(() => (selectedDate ? selectedDate.getMinutes() : 0));

  React.useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
      setHour(selectedDate.getHours());
      setMinute(selectedDate.getMinutes());
    }
  }, [selectedDate]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const formatLocalDateTimeString = (d: Date, h: number, m: number): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(h).padStart(2, "0");
    const min = String(m).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const handleSelectDay = (day: number) => {
    const targetDate = new Date(year, month, day);
    const formatted = formatLocalDateTimeString(targetDate, hour, minute);
    onChange(formatted);
  };

  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour);
    setMinute(newMinute);
    const baseDate = selectedDate || new Date();
    const formatted = formatLocalDateTimeString(baseDate, newHour, newMinute);
    onChange(formatted);
  };

  const handleShortcut = (offsetHours: number) => {
    const target = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
    const h = target.getHours();
    const m = Math.ceil(target.getMinutes() / 15) * 15 % 60;
    setHour(h);
    setMinute(m);
    setCurrentMonth(target);
    const formatted = formatLocalDateTimeString(target, h, m);
    onChange(formatted);
    setOpen(false);
  };

  const displayFormatted = React.useMemo(() => {
    if (!selectedDate) return null;
    return selectedDate.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, [selectedDate]);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#060911] px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer hover:border-amber-500/40",
          open && "border-amber-500 ring-2 ring-amber-500/30"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          <CalendarIcon className="h-4 w-4 text-amber-500 shrink-0" />
          {displayFormatted ? (
            <span className="truncate font-bold text-slate-900 dark:text-white">
              {displayFormatted}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <Clock className="h-4 w-4 text-slate-400" />
        </div>
      </button>

      {/* Popover Calendar + Time Picker */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101c] p-4 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95">
          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => handleShortcut(2)}
              className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all border border-amber-500/20"
            >
              +2h Departure
            </button>
            <button
              type="button"
              onClick={() => handleShortcut(24)}
              className="px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-amber-400 transition-all"
            >
              Tomorrow
            </button>
          </div>

          {/* Month Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {MONTH_NAMES[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-400 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4 text-center">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === dayNum &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={cn(
                    "h-7 w-7 rounded-xl text-xs font-bold transition-all flex items-center justify-center mx-auto cursor-pointer",
                    isSelected
                      ? "bg-amber-500 text-slate-950 font-extrabold shadow-md glow-amber"
                      : "text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-400"
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Time Picker Controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 mr-1" />
              <select
                value={hour}
                onChange={(e) => handleTimeChange(Number(e.target.value), minute)}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00 ({h >= 12 ? (h === 12 ? "12 PM" : `${h - 12} PM`) : (h === 0 ? "12 AM" : `${h} AM`)})
                  </option>
                ))}
              </select>
              <span className="text-slate-400 font-bold">:</span>
              <select
                value={minute}
                onChange={(e) => handleTimeChange(hour, Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 max-h-40"
              >
                {Array.from({ length: 60 }).map((_, m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")} min
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-xs hover:bg-emerald-400 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
