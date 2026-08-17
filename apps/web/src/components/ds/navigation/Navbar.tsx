"use client";

import Link from "next/link";
import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, buttonClass } from "../core/Button";
import { cn } from "../cn";

export interface NavLinkSpec {
  href: string;
  label: string;
}

export interface NavbarProps {
  brand?: string;
  links?: NavLinkSpec[];
  activeHref?: string;
  loggedIn?: boolean;
  onAuthClick?: () => void;
  /**
   * Consecutive days answered. Shown in the bar because a streak nobody can
   * see is not a streak — this one was only ever visible on /profile, which
   * is also the only page that used to advance it.
   */
  streakDays?: number;
  /** Rendered under the bar — used for the auth error strip. */
  banner?: React.ReactNode;
}

function NavLink({
  href,
  label,
  active,
  block = false,
  onNavigate,
}: NavLinkSpec & {
  active: boolean;
  block?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "label-mono whitespace-nowrap transition-fast",
        active ? "text-bone-100" : "text-mute-400 hover:text-bone-100",
        block
          ? cn(
              "block border-b border-l-2 border-b-line-hairline px-8 py-3",
              active
                ? "border-l-signal bg-signal-wash"
                : "border-l-transparent",
            )
          : cn(
              "inline-block border-b py-1.5",
              active ? "border-b-signal" : "border-b-transparent",
            ),
      )}
    >
      {label}
    </Link>
  );
}

/**
 * Sticky 64px bar. The link row collapses behind the menu control below `lg`,
 * with CSS rather than a matchMedia listener.
 */
export function Navbar({
  brand = "Drone Pilot Quiz",
  links = [],
  activeHref,
  loggedIn = false,
  onAuthClick,
  streakDays = 0,
  banner,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-line-hairline bg-ink-900">
      <div className="mx-auto flex h-16 w-full max-w-shell items-center justify-between gap-6 px-8">
        <Link
          href="/"
          onClick={close}
          className="flex flex-none items-center gap-3"
        >
          {/* The 8px signal square stands in for a logo — there is no mark. */}
          <span className="inline-block size-2 bg-signal" />
          <span className="font-display text-sm font-semibold uppercase tracking-label whitespace-nowrap text-bone-100">
            {brand}
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-6 lg:flex">
          {links.map((l) => (
            <NavLink key={l.href} {...l} active={activeHref === l.href} />
          ))}
        </div>

        <div className="flex flex-none items-center gap-2">
          {loggedIn && streakDays > 0 && (
            <span
              title={`${streakDays} consecutive days answered`}
              className="label-mono hidden items-center gap-2 border border-line-hairline px-2.5 py-1.5 text-mute-400 sm:inline-flex"
            >
              <span className="inline-block size-1.5 bg-signal" />
              {streakDays}d
            </span>
          )}
          {!loggedIn && (
            <Link
              href="/register"
              className={buttonClass({
                variant: "ghost",
                size: "sm",
                className: "hidden lg:inline-flex",
              })}
            >
              Create Account
            </Link>
          )}
          <Button
            variant={loggedIn ? "outline" : "signal"}
            size="sm"
            onClick={onAuthClick}
          >
            {loggedIn ? "Sign Out" : "Sign In"}
          </Button>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "inline-flex size-[34px] cursor-pointer items-center justify-center border text-bone-100 transition-fast lg:hidden",
              open
                ? "border-line-strong bg-ink-600"
                : "border-line-hairline bg-transparent",
            )}
          >
            {open ? (
              <XMarkIcon className="size-4 stroke-[1.5]" />
            ) : (
              <Bars3Icon className="size-4 stroke-[1.5]" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line-hairline bg-ink-800 lg:hidden">
          {links.map((l) => (
            <NavLink
              key={l.href}
              {...l}
              block
              active={activeHref === l.href}
              onNavigate={close}
            />
          ))}
          {!loggedIn && (
            <NavLink
              href="/register"
              label="Create Account"
              block
              active={activeHref === "/register"}
              onNavigate={close}
            />
          )}
        </div>
      )}

      {banner}
    </nav>
  );
}
