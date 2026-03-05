# Gestione Parcheggi - Project Guide

## Project Overview
A web application for parking management built with React, Vite, and Firebase.

## Build and Development
- `npm run dev`: Start the development server
- `npm run build`: Build the production application
- `npm run lint`: Run ESLint for code quality

## Deployment
- `npm run build`: Build the project (output to `dist/`)
- `npx firebase deploy --only hosting`: Deploy to Firebase Hosting

## GitHub Workflow (CRITICAL: ALWAYS FOLLOW)
After completing any task, ALWAYS perform the following steps:
1. **Verify**: Ensure the code builds (`npm run build`).
2. **Stage**: `git add .` (or specific files if preferred).
3. **Commit**: Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
4. **Push**: `git push origin main`.

## Coding Standards
- Use functional components and hooks.
- Prefer Tailwind CSS for styling (if applicable, currently uses custom CSS).
- Keep `App.jsx` organized (consider splitting into components if it grows too large).
