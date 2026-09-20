# Self-hosted display fonts

Both fonts are distributed under the SIL Open Font License 1.1; full copyright notices and licenses are included beside the binaries.

- `editorial-serif.woff2`: Noto Serif SC, normal weight 500. Covers 862 unique characters from current site UI and content frontmatter, printable ASCII, and display punctuation. Three official Google Fonts text subsets (at most 400 characters each) were merged with fontTools and encoded as a single WOFF2. This avoids the Google Fonts text endpoint silently returning unrelated Unicode blocks for long text parameters. The final cmap was decoded and checked: all 862 intended characters are present.
- `literary.woff2`: Cormorant Garamond, normal style, official Google Fonts Latin subset; variable weight axis 300–700. Italic may be synthesized by CSS.

`provenance.json` records exact source URLs, subset characters, SHA-256 hashes, byte sizes, and cmap verification. Font delivery is local; visitors do not contact Google Fonts.

For new Chinese heading characters, regenerate the text subset; system fallbacks still render uncovered characters. Licensed upstream sources are Google Fonts (fonts.gstatic.com) and the google/fonts GitHub repository, with license text retrieved through jsDelivr.
