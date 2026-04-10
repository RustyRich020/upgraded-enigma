# JobSync

**Professional job tracking and career management system** with AI-powered analysis, real-time job search, and Firebase backend.

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-brightgreen.svg)](manifest.json)

## Features

### Core Tracking
- **Kanban Board** — drag-and-drop job pipeline (Saved → Applied → Interview → Offer)
- **Table View** — sortable job listing with inline status editing
- **Follow-up Reminders** — browser notifications + push via ntfy.sh
- **CSV Import/Export** — bulk data management
- **Role-based UI** — Candidate, Manager, Executive, Auditor views

### AI-Powered Tools
- **Resume ↔ JD Matcher** — keyword matching (local) + semantic analysis (Google Gemini)
- **Cover Letter Generator** — template-based + AI-generated via Gemini API
- **Skill Extraction** — automatic tech skill detection from PDF resumes

### Job Search
- **Remotive API** — search remote jobs (free, no API key needed)
- **Adzuna API** — search local/global job listings (free tier: 250 req/day)
- **One-click Add** — add search results directly to your tracker

### Career Intelligence
- **Dashboard Analytics** — pipeline donut, source distribution, weekly activity
- **Salary Benchmarks** — BLS national salary data comparison
- **Insights** — funnel analysis, salary distribution, timeline charts
- **Company Profiles** — auto-fetched logos via Clearbit

### Contact Management
- **Email Verification** — Hunter.io integration (25 free/month)
- **Direct Email** — send follow-ups via EmailJS (200 free/month)
- **Bulk Verification** — verify all unverified contacts at once

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla ES Modules (no build step) |
| Styling | CSS Custom Properties + Orbitron font |
| Charts | Chart.js 4.4 |
| PDF Parsing | PDF.js 3.11 |
| CSV | PapaParse 5.4 |
| Email | EmailJS |
| Backend | Firebase Firestore (optional) |
| Auth | Firebase Anonymous Auth |
| Hosting | Firebase Hosting / GitHub Pages |
| PWA | Service Worker + Web App Manifest |

## Quick Start

1. **Clone the repo**
   ```bash
   git clone https://github.com/RustyRich020/upgraded-enigma.git
   cd upgraded-enigma
   ```

2. **Serve locally**
   ```bash
   npx serve . -p 3000
   ```
   Open `http://localhost:3000`

3. **Configure APIs** (optional)
   Navigate to **API Settings** in the sidebar and enter your keys:
   - [Adzuna](https://developer.adzuna.com/) — Job search
   - [Google AI Studio](https://aistudio.google.com/app/apikey) — Gemini AI
   - [Hunter.io](https://hunter.io/api) — Email verification
   - [EmailJS](https://www.emailjs.com/) — Email sending
   - [ntfy.sh](https://ntfy.sh/) — Push notifications

## Firebase Setup (Optional)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Anonymous Authentication**
3. Create a **Firestore Database**
4. Copy your config to `js/config.js`
5. Deploy: `npx firebase deploy --only hosting`

## Project Structure

```
├── index.html          # App shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── firebase.json       # Hosting config
├── firestore.rules     # Security rules
├── css/
│   ├── variables.css   # Design tokens
│   ├── base.css        # Reset & typography
│   ├── layout.css      # App grid layout
│   ├── components.css  # UI components
│   ├── views.css       # View-specific styles
│   ├── animations.css  # TRON animations
│   ├── responsive.css  # Mobile breakpoints
│   └── themes/
│       ├── tron.css    # Cyberpunk theme (default)
│       └── light.css   # Light theme
├── js/
│   ├── app.js          # Entry point
│   ├── config.js       # Constants
│   ├── state.js        # Reactive state store
│   ├── router.js       # SPA routing
│   ├── utils.js        # Utilities
│   ├── firebase/       # Firebase integration
│   ├── services/       # API service modules
│   ├── views/          # View renderers
│   └── components/     # UI components
└── assets/icons/       # PWA icons
```

## Themes

Toggle between **TRON** (red/black cyberpunk) and **Light** (clean professional) using the sun/moon button in the header.

## License

[MIT](LICENSE) — R2D2THERAGEN
