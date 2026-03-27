# 🏁 iRacing Tracker

A clean, motorsport-themed web app to track your iRating and Safety Rating progress session by session.

## Features
- **Log Session** — Record iRating gain/loss, Safety Rating, start/finish positions, car, track, and notes
- **Dashboard** — View current ratings, session history table, and progress charts (iRating, Safety, or both)
- **Editable baseline** — Set your starting iRating/Safety Rating via the ✎ button
- **Phase 2 ** — iRacing API sync coming next

## Setup

### Prerequisites
- Node.js 18+ installed

### Installation

```bash
cd iracing-tracker
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

### First use
1. Click the **✎** button on the iRating or Safety Rating cards to set your current baseline values
2. Go to **Log Session** to record your first race
3. Check **Dashboard** for charts and history

## Project Structure

```
iracing-tracker/
├── server.js          # Express server + SQLite API
├── package.json
├── db/
│   └── iracing.db     # Auto-created SQLite database
└── public/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get current ratings |
| PUT | `/api/settings` | Update current ratings |
| GET | `/api/sessions` | Get all sessions |
| POST | `/api/sessions` | Log a new session |
| DELETE | `/api/sessions/:id` | Delete a session |

## Phase 2 — iRacing API Sync

iRacing has an unofficial API at `https://members-ng.iracing.com`. It requires authentication via cookies from an active iRacing session. The sync button will be added in Phase 2 to automatically pull your latest iRating and Safety Rating.
