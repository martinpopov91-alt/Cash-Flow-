import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Terminal } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unexpected application error.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#1B1B1B] text-[#2B2929] dark:text-[#EEEEEC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden shadow-sm">
          <div className="bg-[#1D1D1D] text-white px-5 py-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#E95420]" />
            <span className="font-display text-sm font-bold">CashFlow</span>
          </div>
          <div className="p-6 space-y-4">
            <h1 className="font-display text-lg font-bold">Something went wrong</h1>
            <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
