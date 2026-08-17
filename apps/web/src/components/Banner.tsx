"use client";

import { Alert } from "@/components/ds";

export type BannerKind = "success" | "error";

interface BannerProps {
  kind: BannerKind;
  message: string;
  onDismiss: () => void;
}

/** Inline replacement for alert(), in the annunciator vocabulary. */
export default function Banner({ kind, message, onDismiss }: BannerProps) {
  return (
    <Alert
      tone={kind === "success" ? "go" : "abort"}
      onDismiss={onDismiss}
      className="mb-6"
    >
      {message}
    </Alert>
  );
}
