"use client";

import { Header } from "@/components/Header";

export default function FiltersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Filters"
        isConnected={false}
        isSimulating={false}
        onConnect={() => {}}
        onDisconnect={() => {}}
        onToggleSimulate={() => {}}
      />

      <main className="flex-1 flex items-center justify-center">
        <p className="text-console-muted text-lg">coming soon</p>
      </main>
    </div>
  );
}
