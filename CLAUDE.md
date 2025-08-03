# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static website for Club TRIAX (American football club) hosted on GitHub Pages. The project uses:
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
├── index.html        # Main homepage file
├── README.md         # Contains GitHub Pages deployment badge
├── assets/          
│   ├── headers/     # Header images for each section
│   └── ogp/         # Open Graph Protocol images
└── specs/           # Design specifications and requirements
    ├── pages/       # Individual page specifications
    └── *.md         # Various specification documents
```

## Development Guidelines

1. **Mobile-First Design**: The site is designed with smartphone users as the primary audience. Use responsive design with mobile-first approach.

2. **Single Page Architecture**: The homepage uses a vertical scroll single-page design with navigation to detailed pages as needed.

3. **Navigation**: Implement hamburger menu navigation for mobile-friendly interface.

4. **Styling**: Use Tailwind CSS utility classes for styling. The CDN version is already included in index.html.

5. **JavaScript**: jQuery is available for DOM manipulation and event handling.

6. **Assets**: Header images are stored in `assets/headers/` with specific names (TOP.jpg, MEMBERS.jpg, NEWS.jpg, etc.)

7. **Version Control**: The main branch is used for deployment. Always commit changes before they go live on GitHub Pages.

## Key Design Specifications

The project follows specific design requirements outlined in the specs/ directory:
- Mobile-first responsive design
- Focus on team member stories and individuality
- Integration with social media (Instagram)
- Support for multilingual content considerations