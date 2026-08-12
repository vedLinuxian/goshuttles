"use client";

import * as React from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  emptyText = "No matching items found.",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, search]);

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

  React.useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  return (
    <div className={cn("relative w-full", open ? "z-40" : "z-10", className)} ref={containerRef}>
      {/* Trigger Button */}
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
          {selectedOption ? (
            <>
              {selectedOption.icon && <selectedOption.icon className="h-4 w-4 text-amber-500 shrink-0" />}
              <span className="truncate font-bold text-slate-900 dark:text-white">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && (
            <span
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>

      {/* Popover Dropdown with Centralised Searchbar */}
      {open && (
        <div className="absolute left-0 right-0 z-[9999] mt-1.5 w-full rounded-2xl border border-slate-700 dark:border-slate-800 bg-slate-950 dark:bg-[#0c101c] p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl ring-1 ring-amber-500/30 animate-in fade-in-0 zoom-in-95">
          {/* Centralized Search Bar */}
          <div className="relative mb-2 px-1">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/80 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const Icon = opt.icon;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer transition-all",
                      isSelected
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/90"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {Icon && <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-slate-950" : "text-amber-500")} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-extrabold">{opt.label}</span>
                          {opt.badge && (
                            <span
                              className={cn(
                                "text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0",
                                isSelected
                                  ? "bg-slate-950 text-amber-400 border-amber-400/30"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              )}
                            >
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <p className={cn("text-[10px] truncate mt-0.5 font-mono", isSelected ? "text-slate-900 opacity-90" : "text-slate-400")}>
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 ml-2 text-slate-950" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
