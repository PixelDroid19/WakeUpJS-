import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CodeLogger } from '../lib/code/errorHandler'; // Assuming CodeLogger is accessible

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error,
      errorInfo: null, // errorInfo is captured in componentDidCatch
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service or console
    console.error("Uncaught error:", error, errorInfo);
    CodeLogger.log('error', 'GlobalErrorBoundary caught an error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo, error }); // Update state with more detailed errorInfo
  }

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prevState) => ({ showDetails: !prevState.showDetails }));
  };

  copyErrorDetailsToClipboard = async () => {
    if (this.state.error && this.state.errorInfo) {
      const errorDetailsText = `
Error: ${this.state.error.name} - ${this.state.error.message}
Stack: ${this.state.error.stack || 'N/A'}
Component Stack:
${this.state.errorInfo.componentStack || 'N/A'}
      `;
      try {
        await navigator.clipboard.writeText(errorDetailsText.trim());
        alert('Error details copied to clipboard!'); // Or use a more subtle notification
      } catch (err) {
        console.error('Failed to copy error details: ', err);
        alert('Failed to copy error details. Please copy manually from console.');
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="h-screen w-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-gray-800 shadow-2xl rounded-lg p-8 text-center">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="mt-6 text-3xl font-extrabold text-red-400">Oops! Something went wrong.</h1>
            <p className="mt-4 text-md text-gray-300">
              An unexpected error occurred. We've logged the issue and our team will look into it.
              You can try reloading the page.
            </p>

            <div className="mt-8 space-x-4">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Reload Page
              </button>
              <button
                onClick={this.toggleDetails}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-md shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                {this.state.showDetails ? 'Hide' : 'Show'} Error Details
              </button>
            </div>

            {this.state.showDetails && this.state.error && (
              <div className="mt-6 p-4 bg-gray-900 border border-gray-700 rounded-md text-left max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Error Details:</h3>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  <strong>Error:</strong> {this.state.error.name} - {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2 text-sm text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-200">View Stack Trace</summary>
                    <pre className="mt-1 p-2 bg-gray-800 rounded text-xs whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
                {this.state.errorInfo && this.state.errorInfo.componentStack && (
                  <details className="mt-2 text-sm text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-200">View Component Stack</summary>
                    <pre className="mt-1 p-2 bg-gray-800 rounded text-xs whitespace-pre-wrap break-all">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
                <button
                  onClick={this.copyErrorDetailsToClipboard}
                  className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
                >
                  Copy Details to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
