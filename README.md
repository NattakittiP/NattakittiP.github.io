# Nattakitti Piyavechvirat · 百文

Source for [nattakittip.github.io](https://nattakittip.github.io/).

A static academic profile built with HTML, CSS, and JavaScript. No build step or package installation is required. Fonts and the profile photograph are stored locally in `assets/`.

## Add research and project images

1. Put your image in `assets/research/`.
2. Set its path in `figures.js`, for example:

```js
"knowbind.jpg": "assets/research/knowbind.png",
"multiworld.jpg": "assets/research/multiworld.jpg",
```

The keys identify the image slots; the value can point to a PNG, JPG, SVG, or WebP file. Leave the value empty to show a placeholder. Selected works and their category entries automatically share the same image. Figures are displayed without cropping.

## Content and layout

Research contains separate Accepted & Published Works (Journal Paper and Conference Paper) and Preprint categories. Knowbind and Multi-World also appear in Selected Work. Projects precede Leadership & Policy. Only the opening introduction paragraph is justified; other long-form text is left aligned.

All 121 original text blocks and their links were retained. The nine tag lines were removed as requested. Details remain available through expandable sections.

The font licenses for DM Sans and Newsreader are included in `assets/`.
