"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);
function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used within a <Tabs>");
  return context;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ defaultValue, value: controlledValue, onValueChange, className, children, ...props }) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "");
  const value = controlledValue ?? uncontrolledValue;
  const handleValueChange = React.useCallback((next: string) => {
    onValueChange?.(next);
    if (controlledValue === undefined) setUncontrolledValue(next);
  }, [controlledValue, onValueChange]);

  return <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}><div className={cn("w-full", className)} {...props}>{children}</div></TabsContext.Provider>;
};

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} role="tablist" aria-orientation="horizontal" className={cn("inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 p-1 text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400", className)} {...props} />);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { value: string; }
const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(({ className, value, children, onClick, onKeyDown, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = useTabs();
  const selected = selectedValue === value;
  const triggerId = `tab-${value}`;
  const panelId = `panel-${value}`;
  return <button ref={ref} id={triggerId} type="button" role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected ? 0 : -1} onClick={(event) => { onClick?.(event); onValueChange(value); }} onKeyDown={(event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role='tab']") || []);
    if (!tabs.length) return;
    const current = tabs.indexOf(event.currentTarget);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  }} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500", selected ? "bg-amber-500 font-semibold text-slate-950 shadow-md" : "hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:hover:text-amber-400", className)} {...props}>{children}</button>;
});
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> { value: string; }
const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(({ className, value, children, ...props }, ref) => {
  const { value: selectedValue } = useTabs();
  if (selectedValue !== value) return null;
  return <div ref={ref} id={`panel-${value}`} role="tabpanel" aria-labelledby={`tab-${value}`} tabIndex={0} className={cn("mt-4 focus-visible:outline-none", className)} {...props}>{children}</div>;
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
