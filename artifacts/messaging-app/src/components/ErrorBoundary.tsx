import React from "react";
import { RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Something went wrong</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              An unexpected error occurred. Please reload the page.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
