# Courtyard UI refinement

Status: source integration verified; new standalone/native candidate still to be frozen. Human sessions0. The changes below are supported by observed defects and the owner's direction; tactile appeal, comfort and delight remain human-review questions.

## Bounded cycle / approximately25 minutes

Player benefit: spend ordinary play with the village, recognize available actions, see discoveries respond, and return from menus comfortably. Evidence: the owner explicitly requests a compact integrated HUD and on-demand information; frozen0.2 inspection reproduced purchase feedback behind the phone drawer, clipped settings return, contradictory Pan labels and a faded mute icon. Figma is unavailable; real engine UI components and gameplay captures are the inspectable design prototype.

| Observed gap | Focused change | Observable check |
| --- | --- | --- |
| Permanent journal and repeated narrative occupy ordinary play | Full-width courtyard, compact helper/mote/clear HUD; Grow opens discoveries when needed; owned/locked discoveries summarize their state | Desktop canvas spans at least94% of viewport width; Grow remains visible and reachable; current light study separately examines actual village scale |
| Phone Grow panel covers purchase toast | Capability miniatures on affordable cards and visible in-card “Discovered” response; permanent short effect label retained | Purchase feedback is unobscured at1280×796,390×844,844×390,820×1180, including Gentle motion |
| Settings return button extends past its clipped dialog | Scrollable settings body and persistent return footer; custom switches/sliders retain large labels | Full return action remains inside the dialog at all four sizes; all secondary controls remain scrollable |
| Pan returns to Direct but says Brush; selected tool remains ambiguous | Accurate Pan instructions and mutually clear selected states; deliberate tool selection exits Pan | Direct→Pan→return matches actual tool and instruction; existing touch/pan checks pass |
| Muted speaker uses the same silhouette at half opacity | Distinct crossed speaker at full opacity, accurate accessible action state | Icon and label change together with sound state |
| In-game Gentle motion does not govern DOM transitions | Document-level preference, preserving static state/confirmation colors | UI transitions/animations turn off immediately; OS preference also respected |
| Drawer focus stays behind panel; fresh save says Saved before one exists | Focus enters/returns through Grow; early save says “Progress saves here”; unavailable storage offers backup guidance | Actual keyboard route opens Grow then buys upgrade; unavailable-storage welcome avoids persistence promise |
| Hover/press and ordinary actions have little sensory distinction | Shared cream/sage paper, rim and inset treatment; quiet short activation sounds, restrained preview/panel motion | Normal/hover/press/selected/disabled state inspection, audio audition, mute/rate/pause checks; human tactile appeal pending |

Before captures: evidence/ui-refinement/before-settings.png, before-journal.png and before-pan.png from frozen0.2 at1280×796. After captures and exact layout measurements are in the same directory. These are automated engine views, not mockups or human playtests.

Eight focused UI checks pass. Existing37 source tests,26 interaction checks and20 accessibility checks pass. The accessibility route was updated to open Grow through Tab/Enter, and pause verification allows only the short deliberate UI cue while the score stays muted, then checks re-suspension. The audit now exits nonzero on a failed check instead of merely reporting it.

Five original UI cues use the existing musical language. They respect Little sounds volume, mute, hidden state and a90ms limiter. Paused cues briefly run through a separate UI bus while music/ambience stay muted, then suspend again; native programmatic pause does not request a UI sound. Nine audition cases and live audio checks pass. Existing36s score rendering remains numerically consistent. Listening remains pending; inspect artifacts/audio/ui/ui-audition.wav and its checks.

## Remaining review gaps

The first full-scene capture still has broad cream flanks and limited value separation. A separate matched lighting/framing experiment is being reviewed before integration. Do not infer that more empty canvas alone gives the village the intended presence. Further subjective revision should use the owner's/current intended players' observations.

Before freezing the next candidate: inspect new UI motion, hover/press and 50-helper backgrounds; check WebKit and native input/save behavior; inspect the lighting candidate separately; package the actual current game; record source/hash/build conditions and provide a short native UI interaction recording. Then observe unfamiliar players for discovery comprehension, purchase recognition, comfortable controls, fatigue and voluntary continuation, and request the owner's separate current-build quality assessment. No gate has passed from automation alone.
