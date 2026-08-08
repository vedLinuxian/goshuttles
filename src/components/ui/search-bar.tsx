"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  paramName?: string;
  debounceMs?: number;
  className?: string;
  name?: string;
  navigateOnChange?: boolean;
}

export default function SearchBar({
  placeholder = "Search...",
  paramName = "q",
  debounceMs = 300,
  className = "",
  name = paramName,
  navigateOnChange = true,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialValue = searchParams.get(paramName) || "";
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(value);

  // Keep ref in sync so debounced callback always reads latest
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const pushParams = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) {
        params.set(paramName, q);
      } else {
        params.delete(paramName);
      }
      // Reset to page 1 when search changes
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams, paramName]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);

    if (!navigateOnChange) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pushParams(next);
    }, debounceMs);
  };

  const handleClear = () => {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    if (navigateOnChange) pushParams("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 border border-[var(--border)] rounded-xl text-sm font-medium bg-[var(--input)] focus:ring-2 focus:ring-[var(--ring)]/40 focus:border-[var(--ring)] outline-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-all shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
