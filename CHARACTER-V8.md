# Sculpted player model v8 — revision 2

Rebuilds the player and squid from the supplied compact character design. The local game uses `assets/character-v8.js`; the existing create/update interface connects the player, bots, remote actors and home preview. The shooter is now a curved white housing with an orange ink chamber and a transparent nozzle. All five weapon placements have been moved within the new arms' reach.

## Geometry and motion

- Authored cubic head and clothing profiles, curved scalp lobes and bangs, thick paired tentacles with conforming spots and recessed suction cups.
- Eye whites, iris textures and black eyelids follow the face surface; they are shallow surfaces rather than separate spherical eyeballs.
- Four continuous `SkinnedMesh` surfaces cover the arms and legs. Each actor owns the bone chains and inverse bind matrices. Shader skinning is explicitly enabled.
- Rounded glove palms, four fingers and a thumb on each hand; shaped sneakers with an ankle opening, tongue, laces, separate sole and outsole.
- Separate framed transparent tank, ink fill and hose. The fill scales from the bottom as the ink decreases.
- Volumetric squid mantle, paired lateral fins, four short arms, separate eye materials and team colors.
- Shared geometry, actor-local materials and skeletons. The squid materials are separate from the human form, including the iris, preventing stealth opacity from leaking into the human.
- Rigged walking, airborne poses, idle movement, tentacle sway and two-bone arm IK. Recoil and existing weapon mechanics remain with the game.

## Validation

```
node tools/check-character-v8.cjs /absolute/path/to/three-r128.min.js
```

This verifies finite geometry/normals, normalized weights, skinning shader setup, real vertex deformation, skeleton/material isolation, stealth isolation, animation, ink level and shooter grip contact. The existing 13 game test files also passed.

A local Three.js r128 browser check generated the player plus seven bots, switched five weapons, changed colors and checked stealth/form isolation without page errors. An independent viewer check reached all five grips with about 0.018 game units between the wrist bone and the contact point (the authored wrist offset).

Eight GLB files were exported and reloaded using Three.js's GLTFLoader. Human and armed exports retain four skinned surfaces and Idle/Run/Jump clips; squid exports retain Swim. Embedded image textures and buffers require no external asset requests. Loaded animation changes the sampled skin vertices by about 0.11 units at the checked frame.

The game capture used a frozen frame, reduced resolution and no shadows in software WebGL. Phone performance and multi-device online play have not been measured. The dense meshes are a sculpting/reference deliverable, not a validated mobile LOD.

## Visual status

Twelve rendering/revision passes addressed silhouette, continuous joints, facial ridges, eye occlusion, hair length, shoes, weapon contact and exported asset behavior. The supplied design remains the target. The face, swept scalp locks, cloth construction and exact grip shape still differ from the reference. This revision is not certified as visual 10/10 and has not been deployed.
