"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Default fallback UI
// ---------------------------------------------------------------------------

function DefaultErrorFallback({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center" role="alert">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mb-6">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Something went wrong
      </h2>

      <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-8">
        An unexpected error occurred. Please try again or refresh the page.
      </p>

      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30 transition-all"
      >
        <RefreshCcw className="h-4 w-4" />
        <span>Try Again</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorBoundary class component
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          reset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}
