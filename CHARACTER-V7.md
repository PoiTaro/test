# Articulated player model v7

Replaces the previous sphere character with a humanoid and squid built from authored curves and surfaces. The model keeps the existing `createKid` contract, so player, bots, remote opponents and the home preview use it. Movement, hitboxes, weapon positions and network messages are unchanged.

- Separate head, face, curved tentacles, headband, shirt, shorts, gloves, sneakers and framed ink tank.
- Actor-local materials prevent recoloring or squid transparency from leaking to other actors or the human form. Only geometry is shared.
- Rigid hierarchical shoulder/elbow/hip/knee joints. Walking, airborne leg poses, tentacle sway, idle breathing and tank level are updated from game state.
- Analytic two-segment arms follow the weapon placement. This is an articulated hierarchy, not a skinned continuous character mesh.
- Character palette entries specify linearColor so existing recoloring also converts their sRGB palette values.

## Checks

Existing 13 test files passed. Additional real-Three.js assertions:

```
node tools/check-character.cjs /absolute/path/to/three-r128.min.js
```

Browser verification with Three.js r128 and software WebGL rendered front, side, back, equipped and squid views. The integrated game created the player and seven bots, switched all five weapons, recolored the player, and checked human/squid visibility and opacity isolation without page errors. The captured game frame was frozen with shadows disabled and reduced render resolution to accommodate software rendering; this is not an iPhone performance measurement. Online networking was not exercised with a second device.

Not deployed. Visual proportions and device performance remain open to user review.
