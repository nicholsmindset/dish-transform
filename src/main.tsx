import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry for error tracking in production
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions for replay
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    // Environment
    environment: import.meta.env.MODE,
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || "1.0.0",
    // Only send errors in production
    enabled: import.meta.env.PROD,
    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      // Network errors
      "Network request failed",
      "Failed to fetch",
      // User cancelled
      "AbortError",
    ],
    // Before sending, filter out sensitive data
    beforeSend(event) {
      // Remove any PII from the event
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

// Error boundary for the entire app
const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);

  if (import.meta.env.PROD) {
    root.render(
      <Sentry.ErrorBoundary
        fallback={({ error, resetError }) => (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8 max-w-md">
              <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
              <p className="text-muted-foreground mb-6">
                We've been notified and are working on a fix.
              </p>
              <button
                onClick={resetError}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        onError={(error, componentStack) => {
          console.error("React Error Boundary caught an error:", error, componentStack);
        }}
      >
        <App />
      </Sentry.ErrorBoundary>
    );
  } else {
    root.render(<App />);
  }
}
