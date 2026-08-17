"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "../cn";

export interface ModalProps {
  open?: boolean;
  /** Mono label bar across the top: "Confirm", "Abort Run". */
  label?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  /** Buttons for the footer, right-aligned. */
  actions?: ReactNode;
  /** Called on scrim click and on Escape. Omit for a modal that cannot be dismissed. */
  onDismiss?: () => void;
  className?: string;
}

export function Modal({
  open = true,
  label = "Confirm",
  title,
  children,
  actions,
  onDismiss,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open || !onDismiss) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      data-testid="modal-scrim"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-[480px] border border-line-strong bg-ink-800 font-display",
          className,
        )}
      >
        <div className="border-b border-line-hairline px-4 py-3 label-mono text-mute-500">
          {label}
        </div>
        <div className="p-5">
          {title && (
            <h2 className="mb-3 text-xl font-medium tracking-tight text-bone-100">
              {title}
            </h2>
          )}
          {children && (
            <div className="text-sm leading-normal text-mute-400">
              {children}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex justify-end gap-2 border-t border-line-hairline p-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
