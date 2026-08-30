# Scatter Press

A two-color halftone particle engine for the browser. Drop in a photo or
SVG and it's resampled into a field of WebGL particles that spring into
place, scatter under the cursor, and reassemble on their own.

## Features

- **Plate** — upload any image (photo, PNG, JPG, WEBP, or SVG); density,
  dot size, contrast, midtones, invert, and shape masking (square / oval /
  circle).
- **Inks** — solid two-color ink/paper, or a multi-stop **depth ramp** that
  maps ink density to a color gradient (histogram-equalized so colors
  spread evenly across the plate, not just the darkest/lightest areas).
- **Physics** — spring-back assembly, pointer push/attract with adjustable
  radius, power, and falloff shape, swirl, ambient turbulence, gravity,
  depth-weighted motion, and **orbit** particles with independent speed,
  radius, eccentricity/axis angle, depth-linked radius, and alternate
  paths (circle, figure-eight, noisy).
- **Assembly** — staggered fly-in on load, replayable on demand.
- **Export** — PNG snapshot, animated GIF, or a self-contained **animated
  SVG** (SMIL-driven, no dependencies) of the current motion.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build locally
npm run lint       # run eslint
```

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- WebGL (raw, no rendering library) for the particle sim
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
  for the toolbar
- [gifenc](https://github.com/mattdesl/gifenc) for client-side GIF encoding

## Project structure

```
src/
  engine/     ScatterPressEngine (WebGL sim, sampling, export) + params
  hooks/      useScatterPress — wires the engine into React state
  components/ Toolbar sections (Plate, Inks, Physics, Assembly) and the
              canvas Stage; components/ui holds the shadcn primitives
```
