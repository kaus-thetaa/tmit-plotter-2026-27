"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// three.js throws instead of degrading gracefully when a webgl
// context genuinely cannot be created, this stops that from taking
// down the whole page and shows a plain message instead
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3d view failed to initialize", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-console-panel">
          <p className="text-console-muted text-xs text-center px-4">
            3d view unavailable, try reloading the page
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
