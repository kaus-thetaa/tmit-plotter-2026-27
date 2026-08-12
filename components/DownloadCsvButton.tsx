"use client";

import { Download } from "lucide-react";

type DownloadCsvButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
};

export const DownloadCsvButton = ({
  onClick,
  disabled,
  label = "download csv",
}: DownloadCsvButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="panel px-3 py-1.5 text-sm flex items-center gap-2 hover:border-console-accent transition-colors disabled:opacity-30"
  >
    <Download size={14} />
    {label}
  </button>
);
