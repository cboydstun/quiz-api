/**
 * The trail's fiction: a commercial drone operator flying out to shoot.
 *
 * Selected with the same date seed as the route, because the one thing that
 * makes a daily trail a daily trail is that everyone flew the same one — and
 * the story is part of the same one. Pure, like route.ts: the date is an
 * argument and nothing here reads a clock or a database.
 *
 * The voice is the design system's: flat, technical, operational. A quiz is a
 * run and a user is an operator, so a leg is a crossing and the client is
 * always waiting.
 */

import { seededRandom } from "./route";

export interface Narrative {
  /** The pre-launch briefing, one line per line of transmission. */
  mission: string[];
  /** One dispatch per leg, in route order. */
  dispatches: string[][];
}

/**
 * The jobs. Each one names a client, a deliverable, and a reason the day cannot
 * simply be repeated tomorrow — which is the same thing the trail itself is.
 */
export const MISSIONS: string[][] = [
  [
    "County wants the bluff line before the winter storms.",
    "Eight waypoints down the coast road, one battery cart.",
    "Stills at 200 feet and a single continuous pass.",
  ],
  [
    "Adjuster has forty claims and three days.",
    "You have the north subdivision. Every roof, every slope.",
    "No landing between structures. Light goes at four.",
  ],
  [
    "Ceremony at six. You have the hour before it.",
    "Rows, the ridge, the barn, one pass over the party.",
    "They paid for golden hour. There is one of those.",
  ],
  [
    "Co-op flagged a sag on the eastern spur after the ice.",
    "Forty miles of conductor, tower to tower, thermal and visible.",
    "Nothing lands until you have the whole span.",
  ],
  [
    "Incident command needs the burn perimeter mapped by dark.",
    "Smoke to eight thousand and it is not lifting.",
    "They will fly crews off your map tomorrow.",
  ],
  [
    "Broker lists it Monday and wants it to look like money.",
    "Twelve hundred acres. House, water, fence lines.",
    "One flight. She is not paying for a second.",
  ],
  [
    "DOT wants the underside of the truss before they close it.",
    "Every gusset, every pin, both approaches.",
    "GPS is unreliable under the deck. You knew that.",
  ],
  [
    "Car spot. The hero shot is the switchback at first light.",
    "Descending, camera left, one take.",
    "Call is 0500 and the pass closes at noon.",
  ],
];

/**
 * Two beats per terrain, so the same leg on two different days does not read
 * identically. Keyed by terrain rather than domain: the terrain is what the
 * operator is looking at.
 *
 * A beat describes the crossing, never the outcome. The instruments carry what
 * a miss cost; narrating that too would mean writing four versions of every
 * line for a sentence nobody re-reads.
 */
const BEATS: Record<string, string[][]> = {
  CHECKPOINT: [
    [
      "Deputy at the trailhead wants to see your certificate.",
      "He is not hostile. He is thorough.",
    ],
    [
      "Ramp check at the staging area.",
      "Paperwork, then you fly. Not the other way round.",
    ],
  ],
  "THE SHELF": [
    [
      "Class B shelf steps down over the next ridge.",
      "Below it you are fine. Above it you are a problem.",
    ],
    [
      "The sectional says the floor drops here.",
      "Read it right the first time. There is no second pass.",
    ],
  ],
  "ICING LAYER": [
    [
      "Ceiling coming down. Airframe picking up rime.",
      "The METAR was an hour old when you read it.",
    ],
    [
      "Front arriving early, the way they do.",
      "Visibility is the deliverable and it is closing.",
    ],
  ],
  "THE CLIMB": [
    [
      "Density altitude is against you and the payload is not light.",
      "The ridge does not move. The margin does.",
    ],
    [
      "Full camera package, thin air, and a wall ahead.",
      "Something gives here, and it should not be the aircraft.",
    ],
  ],
  MAYDAY: [
    [
      "One motor is drawing current it has no business drawing.",
      "You have about ninety seconds of good decisions left.",
    ],
    [
      "Link quality dropping and the return path is uphill.",
      "Decide now, or the aircraft decides for you.",
    ],
  ],
  "THE HANDOFF": [
    [
      "Your visual observer is losing the aircraft in the sun.",
      "Say the thing out loud. That is the whole job.",
    ],
    [
      "Second operator takes the sticks at the turn.",
      "Brief it before the handoff, not during.",
    ],
  ],
  "COMMS SECTOR": [
    [
      "Uncontrolled field ahead and traffic in the pattern.",
      "CTAF is quiet, which proves nothing at all.",
    ],
    [
      "Tower wants a position report you had better get right.",
      "Who, where, what. Nothing else.",
    ],
  ],
  "LONG HAUL": [
    [
      "Fourth hour. You have not eaten and the screen is bright.",
      "Fatigue does not announce itself.",
    ],
    [
      "Sun off the water for two hours straight.",
      "What you see and what is there have parted company.",
    ],
  ],
  "THE FORK": [
    [
      "Two lines through. One is fast and one is legal.",
      "The client is not the one who signs the violation.",
    ],
    [
      "Weather closing behind you and the shot still ahead.",
      "There is a version of this where you go home early.",
    ],
  ],
  "THE FIELD": [
    [
      "Transit over a strip with a windsock and no fence.",
      "Somebody down there is always about to depart.",
    ],
    [
      "Crop duster working the field you need to cross.",
      "He is not looking for you.",
    ],
  ],
  "FIELD REPAIR": [
    [
      "A prop took a branch on the last landing.",
      "It looks fine. Things that look fine are how this goes.",
    ],
    [
      "Pre-flight found play in a motor mount.",
      "Fix it here or explain it later.",
    ],
  ],
  "LAST LIGHT": [
    [
      "Sun is down and the anti-collision light is on you now.",
      "Depth perception was the first thing to go.",
    ],
    [
      "Twilight, and the horizon has just left.",
      "Everything after this is instruments and discipline.",
    ],
  ],
};

/**
 * For terrain nobody has written a beat for. `route.ts` deliberately flies an
 * unrecognised domain rather than dropping it, so this has to exist or a
 * hand-typed domain in /management would take the narrative down with it.
 */
const UNCHARTED: string[] = [
  "Unmapped sector. No brief for this one.",
  "Fly it the way you were trained.",
];

function pick<T>(pool: readonly T[], random: () => number): T {
  return pool[Math.floor(random() * pool.length)]!;
}

export function buildNarrative(
  dateISO: string,
  terrains: readonly string[],
): Narrative {
  return {
    mission: pick(MISSIONS, seededRandom(dateISO, "mission")),
    // Salted per position rather than drawn from one stream, so a leg's beat
    // depends on where it sits as well as which day it is.
    dispatches: terrains.map((terrain, i) =>
      pick(BEATS[terrain] ?? [UNCHARTED], seededRandom(dateISO, `beat:${i}`)),
    ),
  };
}
