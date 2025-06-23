# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static website for Club TRIAX hosted on GitHub Pages. The project uses:
- HTML5
- Tailwind CSS (loaded via CDN)
- jQuery 3.7.1 (loaded via CDN)

## Common Development Tasks

### Local Development

Since this is a static HTML site, you can open `index.html` directly in a browser or use a simple HTTP server:

```bash
npx http-server
```

### Deployment
The site is automatically deployed to GitHub Pages when changes are pushed to the main branch.

## Project Structure

```
/
├── index.html    # Main homepage file
└── README.md     # Contains GitHub Pages deployment badge
```

## Development Guidelines

1. **Styling**: Use Tailwind CSS utility classes for styling. The CDN version is already included in index.html.

2. **JavaScript**: jQuery is available for DOM manipulation and event handling.

3. **Assets**: When adding images or other assets, create appropriate directories (e.g., `images/`, `assets/`) to keep the project organized.

4. **Version Control**: The main branch is used for deployment. Always commit changes before they go live on GitHub Pages.