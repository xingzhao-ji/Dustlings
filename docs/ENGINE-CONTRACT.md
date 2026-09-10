# Courtyard engine contract

Local Canvas 2D game, native ES modules, no runtime dependencies. One courtyard only. World is 1000 × 740 units. Renderer owns projection; simulation owns world coordinates. Ground plane uses an oblique projection: expect roughly x screen = x, y screen = y*.72. Root will use renderer.worldToScreen and screenToWorld for input.

## Renderer module `src/renderer.js`
Export `class Renderer` with constructor(canvas), resize(width,height,dpr), render(state,time), worldToScreen(x,y), screenToWorld(x,y). `width,height` in CSS px, context DPR handled internally. Canvas is full game region, UI separate. render should fit courtyard with margin (mobile needs readable zoom; whole field fit initially). World playable bounds x=110..890, y=155..660. Fountain obstacle center(500,370), radius 74. Buildings/decor outside the playable bounds; all dust sites inside these bounds. A courtyard plinth, paths, flowering plants, little houses and fountain should form a cohesive hand-crafted miniature scene. Ground creatures 9–12 units body radius, grounded contact shadow, leaf ear/antenna, expressive face. No external assets required. Use seeded deterministic decoration.

State fields renderer consumes:
- `dust`: array of {id,x,y,amount,initial,kind} (amount 0..initial, normally initial=1; kind 0..2)
- `creatures`: array of {id,x,y,tx,ty,phase,work,born,dir} (born = elapsed seconds at spawn; phase stable unique phase; work 0/1; dir angle)
- `particles`: array {x,y,vx,vy,life,maxLife,color,size}
- `elapsed`, `cleaned` (units), `totalDust`, `restoration` (0..1), `completed` boolean, `celebration` (seconds remaining)
- `upgrades`: {brush:boolean, teamwork:boolean, bloom:boolean}
- `assignment`: {x,y} or null, `assignmentPulse` seconds remaining
- `pointer`: {x,y,active,inside,touch} world coordinates. pointer set when inside; brush circle has radius `brushRadius`.
- `brushRadius` number, `mode`: 'brush' | 'direct'
- `reducedMotion`: boolean
- `hintTarget`: {x,y} or null (glowing dust intro prompt)

Fountain evolves via restoration: dirty stone before, pale restored stone + turquoise water stream after, flowing animation and flower bloom. At >.85 restoration visible water, 1 full celebration. Draw ground/shadow/creature with consistent depth sorting where appropriate. Completion crowd ring can use simulation coordinates. Renderer can read any values defensively with defaults. No simulation mutations, DOM overlays, audio, or event handling in renderer.

## Audio module `src/audio.js`
Export class `DustAudio`. constructor(); async start(); setMix({music,sfx,ambience,muted,reducedMotion}); setProgress(progress); event(name, intensity=1); setBrushing(active, intensity=1); pause(); resume(); destroy(). Values volume 0..1. Event names: brush, birth, assign, blocked, upgrade, landmark, complete. Bound voices and rate limits. Sound starts only on player gesture. Expose `getCaptureStream()` for recording audio if possible. Optional constructor `context` for OfflineAudioContext QA; document API. No DOM dependencies.

## Root owns
Simulation, input, UI, persistence, responsive CSS, tests, build, gameplay QA/capture. Agents should not edit root-owned modules without coordinating. All work needs benefit/evidence/acceptance note. Changes are hypotheses until human playtests.
