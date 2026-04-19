# EC🌍 AI — Carbon Footprint Tracking & Reduction System

## Project Structure
```
ecotrack-final/
├── frontend/          ← React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx           ← Personal / Organisation tabs
│       │   ├── Signup.jsx          ← Personal / Organisation tabs + org name field
│       │   ├── CarbonCalculator.jsx← Full AI: eco score, anomalies, streak, trending
│       │   ├── Recommendations.jsx ← Smart recs + Trending Solutions tab
│       │   └── ...
│       ├── components/layout/
│       │   └── Sidebar.jsx         ← EC🌍 branding
│       ├── services/api.js         ← All API calls incl. /api/analyze/* & /api/trending/*
│       └── context/AuthContext.jsx ← accountType (personal/organisation) support
├── eco_carbon_ai.py   ← AI logic module (eco_carbon_ai_3.py renamed)
└── app.py             ← Flask backend wiring AI + auth + activities

## Setup

### Backend
```bash
pip install flask flask-cors psutil
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## What's New (vs. original zip)

### EC🌍 Branding
- Sidebar shows **EC🌍** (E and C as characters, O = 🌍 earth emoji)

### Login & Signup — Personal / Organisation Tabs
- Both login and signup pages now have **Personal | Organisation** tab switcher
- Organisation signup includes an **Organisation Name** field
- Account type is stored and shown in the sidebar

### AI Carbon Calculator — Full eco_carbon_ai_3.py Integration
- Now includes **vehicle distance + fuel type** inputs
- Three result tabs:
  - **Analysis** — total CO₂, category, eco score, anomaly detection, 30-day prediction, behavior pattern
  - **AI Suggestions** — prioritised suggestions from the AI engine
  - **Trending Solutions** — personalised trending solutions from the catalogue
- Streak counter shown on eco score card

### Recommendations Page
- Added **Trending Solutions** tab powered by `/api/trending`

### New API Endpoints (app.py)
- `POST /api/analyze/personal` — full personal analysis
- `POST /api/analyze/organisation` — multi-user org analysis + leaderboard
- `POST /api/trending` — personalised trending solutions
- `POST /api/trending/organisation` — group trending solutions
