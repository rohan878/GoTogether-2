import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: any) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 800 }}>Something crashed 😭</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.message}</pre>
          <p>Open DevTools Console for details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
