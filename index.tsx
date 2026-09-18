import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Strangelet Lab Caught Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060810] text-[#E0E0E0] flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="max-w-md p-8 rounded-xl bg-[#0D1220] border-2 border-[#EF4444] shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-950/80 border border-red-500 flex items-center justify-center text-red-400 font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold text-[#FFD700] mb-2 font-['Righteous',sans-serif]">
              STRANGELET LAB CONSOLE RECOVERY
            </h2>
            <p className="text-xs text-[#94A3B8] mb-4">
              A harmonic anomaly was intercepted. The console has stabilized the audio workstation state.
            </p>
            {this.state.errorMessage && (
              <div className="p-3 mb-5 rounded bg-black/60 border border-[#334155] text-red-300 text-[11px] text-left overflow-auto max-h-24">
                {this.state.errorMessage}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-lg bg-[#FF8C00] text-black font-bold text-xs hover:bg-[#FFD700] transition-colors shadow-lg"
            >
              RESTART ANALOG CONSOLE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);