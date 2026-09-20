# Dynamic lettering and motion research

Verified on 2026-09-19 by fetching live official documentation and public source files. These are implementation recommendations for the second design direction; reference illustrations must not be used as page backgrounds or textures.

## Recommended stack

Use **GSAP + SplitText + ScrollTrigger in plain Astro scripts**, a procedural WebGL scene, and progressively enhanced browser view transitions. No React runtime is required. GSAP can coordinate DOM lettering and numeric shader uniforms on the same timeline. Keep one active WebGL context per page and destroy it on navigation; suspend rendering while the document is hidden or the scene is off screen.

Astro currently has GSAP in package.json. Do not add Anime.js alongside it: both solve the same orchestration problem. Native multipage transitions are the least invasive fit for existing pages that initialize on DOMContentLoaded. Astro's ClientRouter is a valid alternative only if all initialization and disposal code is converted to its navigation lifecycle.

## Verified facts and sources

- [GSAP SplitText](https://gsap.com/docs/v3/Plugins/SplitText/): version 3.13+ offers `mask`, `autoSplit`, `onSplit`, automatic screen-reader labels, Unicode-aware character splitting, and responsive re-splitting after font loading or resizing. Return the tween from `onSplit` so it can be cleaned up and recreated. Useful pattern: `type: 'chars,words', mask: 'chars'` for the entrance; `type: 'lines', mask: 'lines'` for restrained section reveals.
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): supports scroll-triggered playback, `scrub`, `pin`, and snapping. Tie a short entrance scene's light displacement to scroll progress; avoid pinning article reading or replacing normal scrolling across the whole site.
- [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/): media-query contexts collect animations and ScrollTriggers, then revert them as conditions change. Use it for fine-pointer interactions, mobile simplification, and `prefers-reduced-motion`. `mm.revert()` disposes those recorded animations.
- [GSAP availability](https://gsap.com/pricing/): the live page explicitly states that the entire GSAP library is free, supported by Webflow and maintained by the original GSAP team.
- [Astro view transitions](https://docs.astro.build/en/guides/view-transitions/): ClientRouter provides lifecycle events, a route announcer, and reduced-motion handling. Initialize page motion on `astro:page-load`; dispose old page instances on `astro:before-swap`; restore theme before the new document paints. Existing scripts need deliberate lifecycle handling when this router is enabled.
- [MDN @view-transition](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition): `@view-transition { navigation: auto; }` opts both documents into same-origin cross-document transitions. The live compatibility label is **Limited availability**. Keep conventional links and a correct full-page fallback; do not make navigation depend on this feature.
- [Anime.js splitText](https://animejs.com/documentation/text/splittext/): available since 4.1, responsive and accessible; from 4.2 it can be imported independently from `animejs/text`. The live example splits words/characters and uses `wrap: 'clip'`, stagger, and a timeline. This is a viable alternative to GSAP, not an additional requirement.
- [React Bits SplitText example](https://reactbits.dev/text-animations/split-text) and its [public implementation](https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/content/TextAnimations/SplitText/SplitText.jsx): the implementation imports GSAP, ScrollTrigger, GSAP SplitText, React hooks, and `@gsap/react`; waits for `document.fonts.ready`; then animates split targets with a stagger. Borrow the behavior and font-ready initialization directly in Astro rather than adding React solely for this component.
- [Codrops: Joffrey Spitzer, Astro + GSAP](https://tympanus.net/codrops/2026/02/18/joffrey-spitzer-portfolio-a-minimalist-astro-gsap-build-with-reveals-flip-transitions-and-subtle-motion/): working Astro case study with masked character/line reveals, `autoSplit` plus returned `onSplit` tweens, and Flip navigation-title transitions. This is a close architectural reference for the existing site.
- [Codrops: shader uniforms and clip-path wipes](https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/): shows GSAP orchestrating shader progress and DOM text masks. Its author reports fixing growing GPU memory by reusing a WebGL effect instead of creating a new context for each title hover. Use the architecture; do not reproduce its aggressive glitch aesthetics or auto-navigation.
- [Codrops: Exat typography microsite](https://tympanus.net/codrops/2026/04/10/the-exat-microsite-pushing-a-typography-showcase-to-new-creative-extremes/): uses cursor distance to control variable-font weight and color; replaces that hover interaction with a static presentation on touch devices; pauses off-screen loops. This supports an expressive but controlled variable-font treatment.

## Concrete visual direction

The entrance should feel like an interactive light field, not an illustration behind a conventional hero. Render sunlight, soft occlusion, drifting dust, and low-intensity night glows procedurally. A large calligraphic Chinese phrase can emerge through per-glyph masks over 0.9–1.2 seconds, with 35–55 ms stagger. Pointer movement bends the nearby light field; a press can briefly disturb its surface. The initial content stays usable without finishing an animation or pressing an “enter” gate.

- **Home:** calligraphic Chinese lettering with a sweeping mask and slight depth; an English Space Grotesk line subtly changes weight near the pointer. Reserve each glyph's layout box before changing weight to prevent reflow. Let the procedural scene react to movement and touch.
- **Works:** images of actual projects emerge from cropped planes; hovered project names roll vertically through a duplicate clipped text layer. Use an underline, background tint, or circular selection marker instead of arrows.
- **Notes:** tighter type, a moving light band behind the page title, and short line-mask reveals once on entry. The archive list should respond to focus/hover with a local accent and date movement, without animating every letter continuously.
- **Tutorials:** chapter labels appear in a measured stagger; a single restrained route/path accent can indicate progression. Preserve ordinary links, reading order, and touch targets.
- **About:** a signature-style brush title and a short word-by-word entrance. Allow one typographic interaction, such as a modest weight response in the Latin name line.
- **Article details:** keep body text stable. Use only an entry reveal for the title and a subtle reading-progress accent. Code, equations, and reference images remain fully legible.
- **Route changes:** 250–400 ms soft mask or crossfade while preserving the theme. Each route may have a different entrance motif, but duration, easing, and color response should feel related. Avoid heavy blur transitions over entire pages.

For split text, keep accessible full labels and hide decorative duplicates from assistive technology. Await the actual display font before measuring lines. On reduced motion, render final states immediately and stop continuous scene motion; provide native hover/focus states. Touch devices receive brief tap feedback and a simpler ambient scene.

## Self-hosted fonts supplied

- `public/fonts/expressive-chinese.woff2`: **Ma Shan Zheng**, normal 400, 330,572 bytes. A brush-written Chinese display face for the entrance, signature, and selected page headings; use a neutral sans face for navigation and body text. Final cmap was decoded with fontTools: 876 mapped codepoints; every Chinese character in the 877-character requested set is present. The only omitted requested character is U+00B7 MIDDLE DOT, which the Latin fallback covers. The set includes all Chinese characters in the final Astro UI, collected Markdown frontmatter, ASCII, punctuation, and entrance vocabulary. The final pass added the inner-page heading character 沉 and four other UI characters. An independent Chromium rendering probe after document.fonts.ready returned only MaShanZheng-Regular (isCustomFont: true, 45 glyphs) for the complete entrance and inner-page brush headings, including 浮光游境 / 造境 / 拾光 / 寻径 / 回声 / 雪轻遮 / 作品档案 / 思绪沉积 / 学习轨道 / 关于我 / 吟处雪轻遮.
- `public/fonts/space-grotesk.woff2`: **Space Grotesk**, variable `wght` 300–700, 22,288 bytes; 230 mapped codepoints and all printable ASCII. Use for English display lettering, numbers, microcopy, and variable-weight interactions.
- Both binary signatures are WOFF2 and both were decoded successfully. Full SIL Open Font License 1.1 notices are in `Ma-Shan-Zheng-OFL.txt` and `Space-Grotesk-OFL.txt`. `motion-font-provenance.json` records exact official Google Fonts URLs, subset characters, processing, hashes, and cmap checks. No fonts or source images are loaded from third-party servers by visitors.
- These files are additions; the previous serif fonts remain available but need not be used in this design direction. New Chinese copy may require refreshing the display subset.

Suggested declarations:

```css
@font-face {
  font-family: 'Light Brush';
  src: url('/fonts/expressive-chinese.woff2') format('woff2');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Space Grotesk';
  src: url('/fonts/space-grotesk.woff2') format('woff2');
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
}
```
