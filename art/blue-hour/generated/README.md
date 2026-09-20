# Supplied Blue Hour illustration

The site owner supplied the complete generated artwork and eight generated PNG cutouts
on 2026-09-20. These are separate from the initial visual reference. No original download was modified.

`work/prepare-blue-hour-art.mjs` converts the supplied images to WebP (quality 94,
alpha quality 100), keeping the 1672 × 941 canvas and true transparency. The complete
image provides a no-WebGL/loading fallback. The source layers have matching canvas
sizes but were regenerated at different content scales; their transforms are recorded
in `src/scripts/blue-hour-illustration.ts` and `work/registration-results.json`.

Active layers, back to front:

1. `landscape.webp` — background supplied as (1).
2. `meadow.webp` — middle flowers supplied as (2).
3. `back-hair.webp` — hair supplied as (3), registered behind the face/body.
4. `character.webp` — supplied as (4), with the face and hands kept still.
5. `foreground.webp` — supplied as (7), covering the original bottom crop of the dress.
6. `petals.webp` — supplied as (8).

`flowing-hair.webp` (5) is an alternative hair rendering, and `ribbons.webp` (6)
includes duplicated hair/shoulder decoration. They are preserved as supplied variants
but are not loaded by the active scene, to avoid doubling those details.

Hair and dress keep the same parallax offset at their attachment points. Only free
ends deform. Foreground flowers have greater parallax, and the bottom 20% of the
foreground mesh extends to cover the viewport without shifting its upper silhouette.
The previous hand-authored SVG character is no longer imported or rendered.
