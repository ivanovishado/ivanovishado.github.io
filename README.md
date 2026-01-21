# Ivan Galaviz - Personal Website

A modern, responsive personal website showcasing my experience as a Software Engineer. Built with Vite, Tailwind CSS, and GSAP.

## 🚀 Quick Start

### Prerequisites

- Node.js v22 or higher (Recommended: use `nvm install 22` && `nvm use 22`)

### Installation

```bash
# Install dependencies
npm install
```

### Local Development

Start the Vite development server with hot module replacement:

```bash
npm run dev
```

Then open http://localhost:5173 in your browser.

### Building for Production

To create an optimized production build (minified HTML/CSS/JS):

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

### Mobile Testing

1. Ensure your mobile device is on the same WiFi network.
2. Run `npm run dev -- --host` or `npm run dev-mobile`.
3. Open the **Network** URL displayed (e.g., `http://192.168.x.x:5173`) on your mobile device.

## 🛠️ Tech Stack

- **Vite** - Build tool and development server
- **HTML5** - Semantic markup with partial injection (`vite-plugin-html-inject`)
- **Tailwind CSS** - Utility-first styling (PostCSS build)
- **GSAP** - Professional animation library
- **Lenis** - Smooth scrolling
- **Three.js** - 3D effects

## 📁 Project Structure

```
├── index.html              # Main entry point (shell)
├── src/
│   └── sections/           # HTML partials (hero, navbar, etc.)
├── styles/
│   ├── components/         # Component-specific CSS
│   ├── tailwind.css        # Tailwind entry point
│   └── styles.css          # Main stylesheet
├── scripts/
│   ├── animation/          # GSAP and scroll logic
│   ├── components/         # UI component logic (menu, buttons)
│   └── main.js             # JS entry point
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── .github/workflows/      # CI/CD for GitHub Pages
```

## 🌐 Deployment

This site is automatically deployed to GitHub Pages via GitHub Actions whenever changes are pushed to the `main` branch.

1. Commits trigger the `Deploy to GitHub Pages` workflow.
2. The site is built (`npm run build`).
3. The contents of `dist/` are deployed.

## 📄 License

See [LICENSE](LICENSE) for details.
