"use client";

import { useEffect, useState } from "react";
import { RouteStrip, type RouteStripProps } from "./RouteStrip";

export interface AnimatedRouteStripProps
  extends Omit<RouteStripProps, "position"> {
  /** Where the aircraft was before the last answer landed. */
  from: number;
  /** Where it is now. */
  to: number;
}

/**
 * A route strip that arrives at its old position and then flies to the new one.
 *
 * The screens are siblings in the page's cascade, so `Question` -> `Verdict`
 * unmounts the whole subtree and the strip remounts already at the new
 * position. A CSS transition needs a change to animate, and a fresh mount is
 * not one — the advance appeared as an aircraft that had simply always been
 * there. Same failure, same fix, as `AnimatedMeter`.
 *
 * The move is scheduled in a `requestAnimationFrame` rather than called from
 * the effect body. That is not lint appeasement: setting state synchronously in
 * an effect can be batched into the same paint as the mount, and then there is
 * still no transition. The frame guarantees the browser paints `from` first.
 */
export function AnimatedRouteStrip({
  from,
  to,
  ...rest
}: AnimatedRouteStripProps) {
  const [position, setPosition] = useState(from);

  useEffect(() => {
    setPosition(from);
    if (from === to) return;

    const frame = requestAnimationFrame(() => setPosition(to));
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  return <RouteStrip {...rest} position={position} />;
}
