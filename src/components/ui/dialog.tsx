"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within a <Dialog>");
  return context;
}

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open: controlledOpen, onOpenChange, children }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback((next: boolean) => {
    onOpenChange?.(next);
    if (!isControlled) setUncontrolledOpen(next);
  }, [isControlled, onOpenChange]);

  return <DialogContext.Provider value={{ open, setOpen, titleId, descriptionId }}>{children}</DialogContext.Provider>;
};

const DialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, onClick, ...props }, ref) => {
    const { setOpen } = useDialog();
    return <button ref={ref} className={className} onClick={(event) => { onClick?.(event); setOpen(true); }} {...props}>{children}</button>;
  },
);
DialogTrigger.displayName = "DialogTrigger";

const DialogPortal = ({ children }: { children: React.ReactNode }) => {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
};

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { open, setOpen } = useDialog();
    if (!open) return null;
    return <div ref={ref} aria-hidden="true" onClick={() => setOpen(false)} className={cn("fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm", className)} {...props} />;
  },
);
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, titleId, descriptionId } = useDialog();
    const internalRef = React.useRef<HTMLDivElement>(null);
    const lastFocused = React.useRef<HTMLElement | null>(null);
    const contentRef = ref || internalRef;

    React.useEffect(() => {
      if (!open) return;
      lastFocused.current = document.activeElement as HTMLElement;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const content = internalRef.current;
      content?.focus();

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
        if (event.key !== "Tab" || !content) return;
        const focusable = content.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = previousOverflow;
        document.removeEventListener("keydown", onKeyDown);
        lastFocused.current?.focus();
      };
    }, [open, setOpen]);

    if (!open) return null;

    return (
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={(node) => {
              internalRef.current = node;
              if (typeof contentRef === "function") contentRef(node);
              else if (contentRef) contentRef.current = node;
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className={cn("relative grid w-full max-w-lg gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-2xl", className)}
            {...props}
          >
            {children}
            <button type="button" aria-label="Close dialog" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />;
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", className)} {...props} />;
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => { const { titleId } = useDialog(); return <h2 id={titleId} ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />; });
DialogTitle.displayName = "DialogTitle";
const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => { const { descriptionId } = useDialog(); return <p id={descriptionId} ref={ref} className={cn("text-sm leading-relaxed text-slate-500 dark:text-slate-400", className)} {...props} />; });
DialogDescription.displayName = "DialogDescription";
const DialogClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, onClick, ...props }, ref) => { const { setOpen } = useDialog(); return <button ref={ref} className={className} onClick={(event) => { onClick?.(event); setOpen(false); }} {...props} />; });
DialogClose.displayName = "DialogClose";

export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
