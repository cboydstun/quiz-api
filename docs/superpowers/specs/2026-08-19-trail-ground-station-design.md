# Trail ground station — design

2026-08-19. Turns `/trail` from a slideshow of screens into a persistent
ground-control-station (GCS) shell where the run plays out continuously: the
drone flies, instruments drain live, and the beats swap inside the console
instead of unmounting it.

Reviewed adversarially before this was written; the review's fixes are folded
in and called out inline where they changed the design.

## Framing

The operator is a Part 107 remote pilot at a ground station, not a pilot in a
cockpit. Everything on screen is what the aircraft sends back: a downlink
feed, telemetry, instruments. The copy speaks GCS — UPLINK, TELEMETRY, FEED,
LINK — and the endings are ground-station endings: an arrival is a feed of a
landed aircraft; a loss is the feed cutting out.

## What does not change

- `engine.ts` and `TRAIL_RULES` — untouched. The ~75% survival line pinned by
  `engine.test.ts` stays pinned. Everything below is picture and pacing.
- The GraphQL contract, both mutations, the one-attempt-a-day arrangement,
  and the signed-out grading path.
- `Briefing`, `Spent`, and `Debrief` remain full-page screens outside the
  shell. The shell exists from launch to the end of the ending beat.
- The design system: no gradients, no shadows beyond the two focus glows, no
  scale, no lift, radius 0. Rotation is allowed (`offset-rotate` and FlipCard
  already rotate); the Drone mark may yaw, never scale.

## Architecture

```
trail/
  page.tsx            queries, run state, analytics. No layout, no beats.
  TrailShell.tsx      persistent GCS console. Mounts at launch, unmounts
                      after the ending beat.
    HUD.tsx           route strip + battery/airframe/daylight meters +
                      telemetry + audio toggle + notice slot. Live values.
    World.tsx         the downlink feed: three parallax bands + weather wash,
                      scrolled by the flight clock.
    Drone.tsx         the aircraft mark: hover bob, yaw, damage judder,
                      burst lean, crash descent.
    panels/
      Dispatch.tsx    the crossing beat, inside the shell (see Beats).
      Question.tsx    the ask.
      Verdict.tsx     what it cost.
      Ending.tsx      arrival / signal lost.
  useFlightClock.ts   the one clock (see Flight clock).
  useReducedMotion.ts shared hook; replaces the copies in Teletype and
                      Telemetry. Subscribes to changes.
  audio.ts            WebAudio synthesis. No audio files.
  terrain.ts          extended: emits a tiling band with matched seams
                      (see Terrain band). Existing exports unchanged.
```

Deleted: `AnimatedMeter.tsx`, `AnimatedRouteStrip.tsx`, and their tests. They
exist only to re-fake continuity across remounts; a shell that never unmounts
animates a live value with a plain CSS transition. The `before` capture in
`page.tsx` goes with them.

`RouteStrip`, `TerrainProfile`, `Teletype`, `Telemetry` survive and move under
the shell's use. `RouteStrip`'s `data-testid="route-marker"` and its
transition tokens are load-bearing in tests and stay.

## Flight clock

One `requestAnimationFrame` loop in `useFlightClock`. Everything that moves
per-frame hangs off it; there is no `setInterval` daylight timer any more.

**The clock animates; the verdict drives.** Position is never derived from
raw elapsed time — in this game progress is bought by graded answers arriving
over a slow network, and a time-driven position shows arrivals the engine
never granted. The clock owns a per-segment state machine:

- `HOLD` — question open. Drone bobs in place at the segment position the
  last verdict left it at. Daylight counts down. World creeps at idle rate.
- `AWAITING_LINK` — commit clicked, grade in flight. **Clock frozen** (this
  adds `grading` to the paused set — a deliberate behavior change from
  today, where daylight burns during the round trip; with the clock as
  visible motion, burning it against network latency is wrong). Drone dips,
  telemetry LINK stutters. A grading error returns to `HOLD` exactly where
  it froze.
- `BURST` — an advancing verdict landed. Whatever daylight was left
  compresses into a ~900ms run to the segment end: `--flight-speed` ramps to
  ~6 and eases out, world scroll accelerates, drone leans. The daylight
  *display holds at the commit value* throughout — the resource meter must
  not race to zero and flash abort at the moment of success. Reset to 45s
  when the next question opens. The expiry latch is disarmed during BURST.
- `CRASH` — a DOWN verdict. The drone descends at its current x. It never
  crosses to a node the engine says it did not reach.
- `HIDDEN` — `visibilitychange` to hidden pauses the clock and suspends the
  AudioContext; visible resumes both. A hidden tab is a free pause on
  purpose: the repo already documents the clock as a difficulty knob, not a
  reading-speed test, and anti-cheat is an explicit non-goal (the anonymous
  one-a-day gate is documented as trivially bypassable).

**No setState at 60fps.** The loop writes `--flight-progress` and
`--flight-speed` as custom properties onto a ref'd node scoped to the
World/Drone subtree (never a high ancestor — a per-frame write on the shell
root forces recalc for every descendant). Easing happens inside the loop —
unregistered custom properties do not interpolate, and registering
`@property` is a mechanism this repo does not otherwise use. The only
per-second `setState` is the whole-second daylight readout.

Both the HUD route strip marker and the world read the same
`--flight-progress`. One variable, one truth; the strip and the feed cannot
disagree mid-burst.

## Beats

Order, from launch:

1. **Boot** — shell mounts, link acquisition sequence over `Teletype`:
   `UPLINK ... ok / TELEMETRY ... ok / ROTOR ARM ... ok / FEED ... live`.
   Instruments fade in staggered (existing `signal-in` + inline delay
   pattern from Debrief). Route unrolls on the strip.
2. **Dispatch, leg 0** — leg one is a crossing like any other (today's
   `setCrossing(0)`). The Dispatch panel keeps all five of the Crossing
   screen's jobs: terrain reveal, terrain name + hazard status, dispatch
   teletype, the **"Fly the leg" gate button**, and the daylight hold.
   `page.test.tsx` drives the flow through that button and asserts the beat
   order and terrain naming; those assertions survive verbatim.
3. **Question** — clock starts. Commit or expiry leads to:
4. **Verdict** — panel arrives with `signal-in`; it does **not** ride the
   burst. Panels are stationary; the world moves. Daylight shown frozen at
   commit value (today's behavior, kept).
5. Loop 2–4 per leg. Each leg boundary fires a **`TRANSIT −6` mark** on the
   battery meter when Dispatch takes over — the persistent meter would
   otherwise visibly drop 6% (or 14% lumped with a miss) unexplained,
   because `answerQuestion` applies transit in the same update as damage.
6. **Ending** — arrival: a synthetic final approach past the last waypoint
   (the engine's `routePosition` clamp stays; the approach is picture, not
   state — marked synthetic so nobody "fixes" the clamp), feed of a landed
   aircraft, teletype. Loss: feed cuts — opacity-step flicker, not a noise
   filter or gradient — LINK 0%, hold, teletype. Then the shell unmounts
   and `Debrief` renders as a full page, exactly as today.

## Impact and damage

A miss fires a damage presentation keyed by `state.answered` — a fresh
element per verdict, so CSS animations restart without `setTimeout`
choreography (the repo's declarative preference, kept).

- `−8` mark rises off the battery meter and fades. `−25 AIRFRAME` likewise on
  hazard damage.
- Instrument row washes `bg-abort` (the existing Instruments `damaged`
  mechanism, now on the live HUD).
- Frame flash: 1px abort border pulse on the feed. **Not a vignette** — a
  vignette is a radial gradient and the system bans gradients.
- Drone yaws off-track and recovers (rotate, never scale).
- Telemetry LINK stutters; feed judders (existing `glitch` utility on the
  panel stays).
- Hazard damage adds a hairline fracture overlay drawn as strokes — reads as
  feed artifact.

## Terrain band

`terrain.ts` grows a band generator that stitches per-leg silhouettes into
one scrollable ground. Adjacent legs' silhouettes do not meet (each is damped
to its own `from`/`to` heights — THE CLIMB exits at 0.82, THE FIELD enters at
0.20: a cliff at every seam), so the band generator takes the previous leg's
exit height as the next leg's entry height, blending deterministically —
seeded by terrain name + leg index, identical for every operator, same
tomorrow. Existing exports and their tests untouched; the band is new API
with new tests. `terrain.test.ts` is *extended*, not rewritten.

Parallax: three bands — far ridgeline, mid ground, near foreground — moved
with `translate3d` at different rates from `--flight-progress`. Weather is a
flat opacity wash keyed to terrain name (icing haze, dusk dim) — flat color
at partial opacity, never a gradient.

## Audio

WebAudio synthesis in `audio.ts`, no assets. Rotor is filtered noise, thin
and radio-ish — GCS speakers, not engine roar — pitch tracking
`--flight-speed`. Waypoint chime, miss thud, and a low two-tone battery alert
under 20% (not a klaxon; the system's copy is flat and technical) are
oscillator envelopes.

Lifecycle: **muted by default**; the AudioContext is created lazily on the
first unmute gesture (autoplay policy leaves an eager context suspended
anyway). Suspend on `visibilitychange` hidden and on shell unmount; effects
idempotent with real cleanup so StrictMode's dev double-mount cannot leave
two rotor loops. The toggle is a real labeled button in the HUD, `label-mono`
styling, keyboard-reachable. Preference persisted at `trail:audio`
(following the `trail:flown:` convention). Audio preference is independent
of the motion preference.

## Reduced motion

Zeroed tokens are not enough here: a rAF loop does not read tokens, and a
0ms infinite animation is a busy loop (global.css says so itself). Under
`prefers-reduced-motion`:

- The clock switches to a 1s tick; the world holds still; position snaps
  per verdict. Same run, no motion.
- Every new ambient loop — drone bob, weather drift, scan line reuse — is
  added to the `animation: none` list in global.css, not just token-zeroed.
- `useReducedMotion` subscribes to `change`. A mid-run flip settles the
  world immediately and switches clock mode at the next question boundary.

## Notices

Existing bug, claimed by this work: `finish()` sets a notice when
`recordTrailRun` fails, but only the Question screen renders `notice` — and
`finish` runs when the run is over, so "The run finished but could not be
filed." is invisible today. The HUD carries the notice slot, so it renders
in every beat including the ending.

## Tests

- `useFlightClock` gets unit tests with mocked `performance.now` and rAF.
  Note for the implementer: vitest fake timers need
  `toFake: ['requestAnimationFrame', 'performance']`, and jsdom's rAF is
  fiddly — budget for it.
- `page.test.tsx` is rewritten to the new mount points, keeping its
  assertions (beat order, "Fly the leg", terrain naming, verdict content,
  signup wall, one-a-day). All page tests run reduced-motion today, which
  would ship the flight path untested — new page-level tests cover: expiry
  commits `null`; commit freezes the clock; grading error unfreezes in
  place; visibility pause; burst disarms the expiry latch; `TRANSIT −6`
  fires at the boundary.
- The shared `useReducedMotion` reads `.matches` at mount (the test
  matchMedia mock's `addEventListener` is a no-op, so mid-test toggles do
  not propagate — tests set the value before mount).
- `AnimatedMeter.test.tsx` and `AnimatedRouteStrip.test.tsx` are deleted
  with their components. `RouteStrip`, `Telemetry`, `Teletype`,
  `TerrainProfile` tests survive. `engine.test.ts` untouched;
  `terrain.test.ts` extended.
- The standing regression grep (`rounded-*`, `shadow-*`, `bg-linear-to-*`,
  `scale-*`) must stay clean over everything new.

## Analytics

`trackEvent("trail_start" | "trail_end" | "quiz_signup_prompt")` stay in
`page.tsx` through the split — named here so they are not lost.
