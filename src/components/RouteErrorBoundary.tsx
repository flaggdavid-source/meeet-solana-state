import React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

/** Wraps a lazy-loaded page with its own error boundary */
const RouteErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

export default RouteErrorBoundary;
