"use client";

export type BannerKind = "success" | "error";

interface BannerProps {
  kind: BannerKind;
  message: string;
  onDismiss: () => void;
}

const STYLES: Record<BannerKind, string> = {
  success: "bg-green-100 border-green-500 text-green-800",
  error: "bg-red-100 border-red-500 text-red-800",
};

/** Inline replacement for alert(). */
export default function Banner({ kind, message, onDismiss }: BannerProps) {
  return (
    <div
      className={`border-l-4 p-4 mb-6 rounded-lg flex items-start justify-between gap-4 ${STYLES[kind]}`}
      role="alert"
    >
      <p>{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="font-bold leading-none"
      >
        &times;
      </button>
    </div>
  );
}
