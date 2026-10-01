# Skybound Arcade · v17.0

The home screen now has a colorful arcade grid alongside the existing Adventure, Creative, Daily World, Dragon Isles, and multiplayer choices. Open the project with `npm start`, or run `npm run preview` for port 3002.

## Parkour campaign

Choose any of 12 courses. The original Cloudstep Circuit remains available, followed by eleven progressively longer routes with distinct palettes, checkpoint stages, finish arches, and individual saved best times. Three animated AI pace runners jump along the route. Complete a course to advance directly to the next level, replay, or open the course selection screen. Every platform transition is tested with the actual movement controller at 60 and 20 FPS.

## Instant arcade

Each local arcade round starts with five explicitly labeled AI opponents, a three-second countdown, objective display, leaderboard, result screen, and replay controls.

- **Gem Rush:** collect gems worth one or three points; collected gems return after five seconds.
- **Spleef:** aim down and attack to remove nearby floor tiles; avoid holes and survive.
- **Color Drop:** find the named color within five seconds; other tiles disappear for three seconds.
- **Infection:** evade infected players; tagged players become hunters and can tag others.
- **Crown Control:** earn points inside the central ring and knock opponents away.
- **Sky Battle:** attack opponents, earn knockout points, and respawn after defeat.

AI chooses objectives, moves around holes, collects shared gems, attacks in range with cooldowns, and reacts to color rounds. Arcade modes currently run locally against AI; human multiplayer remains available in Creative, Bed Wars, and Manhunt. Pausing a local round pauses its AI and timer. Desktop uses WASD, Space, Shift, and mouse attack; touch uses the movement stick, jump, sprint, and attack buttons.

## Competitive AI

Starting Bed Wars or Manhunt alone adds a clearly named AI opponent. Bed Wars AI spends its finite resources, builds synchronized bridges, returns for supplies, attacks opponents, and targets the enemy bed. Manhunt AI respects the head start and pursues the runner. Existing human parties retain their normal readiness checks and team assignment. AI-only abandoned rooms are removed. These multiplayer modes need the Node server; static hosting supports the local arcade and parkour modes.

## Visuals and saves

The redesigned hub uses original block art, colorful game cards, and responsive layouts. Arenas have distinct floor palettes, floating gardens, illuminated towers, animated competitors, and mode-specific gems or objective effects. The art and interface are original, with the accessible block-world arcade feel requested by the player.

Local arcade and parkour sessions preserve and restore the previous solo world. They never save temporary arena terrain into the Adventure, Daily, or Creative slots. Parkour best times are stored separately.

## Validation

Run `npm test` for unit, movement, save, and multiplayer regressions. With the preview server and an isolated Chrome debugging session on port 9224, run `npm run test:arcade` and `npm run test:competitive` for browser checks. Browser screenshots are written to `/private/tmp/voxel-vault-skybound-*.png`.
