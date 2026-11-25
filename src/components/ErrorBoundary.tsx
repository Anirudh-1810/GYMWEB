import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#F4F6F8] text-slate-950 dark:bg-[#090B0E] dark:text-[#F3F5F7] flex items-center justify-center p-6">
        <div
          role="alert"
          className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11151B] p-6 sm:p-8 shadow-2xl text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-wide text-slate-950 dark:text-[#F3F5F7]">
            Something Went Wrong
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-[#94A3B8]">
            An unexpected error occurred while loading your gym dashboard. Reload the page to continue.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-[#C8FF00] hover:bg-slate-800 dark:bg-[#C8FF00] dark:text-[#090B0E] dark:hover:bg-[#D6FF3D] px-5 py-2.5 text-sm font-bold transition-colors"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Reload Dashboard</span>
          </button>
        </div>
      </div>
    );
  }
}
