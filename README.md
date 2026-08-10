# Bicycle Parking Tracker

A Progressive Web App (PWA) for finding and contributing bicycle parking spots using OpenStreetMap data. No API keys required — all data is free and open.

**Live:** https://bicycle-parking-tracker.vercel.app  
**GitHub:** https://github.com/Ikpong-Joseph/bicycle-parking-tracker

---

## Features

- **Find parking near you** — auto-locates via GPS, queries OpenStreetMap's Overpass API
- **Search near a destination** — type any postcode or place name to find parking there instead
- **List + map view** — toggle between a distance-sorted list and an interactive Leaflet map
- **Adjustable radius** — 250m / 500m / 750m / 1km / 2km
- **Spot detail** — type, capacity, covered status, fee, last edited date, directions (Google Maps / Apple Maps)
- **Contribute back** — log in with your OSM account and add missing spots directly to OpenStreetMap
- **Offline support** — IndexedDB caching serves last-known data when the network is unavailable
- **Installable PWA** — add to home screen on Android (Chrome) or iOS (Safari → Share → Add to Home Screen)

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | PWA support, static export, Vercel deploy |
| PWA | Serwist (`@serwist/next`) | Service worker, tile caching |
| Map | Leaflet (lazy-loaded) | Lightweight, no API key |
| Data | Overpass API | Free OSM query API, 4-mirror fallback |
| Geocoding | Nominatim | Free OSM geocoder for destination search |
| Cache | IndexedDB | Client-side spatial cache with TTL |
| Auth | OSM OAuth 2.0 PKCE | No backend secret needed |
| Styling | Tailwind CSS v4 | Utility-first, dark theme |
| Deploy | Vercel | Free tier, HTTPS, CDN |

**No backend. No database. No API keys. Zero ongoing cost.**

---

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3001
```

### Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_DEFAULT_LAT=53.0126       # Default map centre (used if GPS denied)
NEXT_PUBLIC_DEFAULT_LON=-2.2278
NEXT_PUBLIC_OSM_ENV=sandbox           # 'sandbox' | 'production'
NEXT_PUBLIC_OSM_CLIENT_ID=            # From openstreetmap.org/oauth2/applications
```

For the contribute flow, register an OAuth 2.0 app at [openstreetmap.org/oauth2/applications/new](https://www.openstreetmap.org/oauth2/applications/new):
- **Redirect URI:** `http://localhost:3001/auth/callback` (dev) / `https://your-app.vercel.app/auth/callback` (prod)
- **Scope:** `write_api`
- **Confidential application:** unchecked (PKCE public client — no secret needed)

---

## How It Works

### Data pipeline

```
User opens app
  → GPS geolocation (4s timeout, falls back to default coords)
  → Check IndexedDB cache (spatial + TTL check)
      → Fresh (< 1hr): show immediately, done
      → Stale (1–24hr): show immediately, background-refresh
      → Miss / expired: fetch from Overpass API
  → Overpass query with 4-mirror fallback (6s per mirror)
  → Write to IndexedDB, render spots
```

### Caching strategy

Cache key: `"{lat.toFixed(2)},{lon.toFixed(2)},{radius}"`

A cached area is a hit if the stored centre is within 50% of the radius from the query centre.

| Age | Behaviour |
|---|---|
| < 1 hour | Serve from cache, no network call |
| 1–24 hours | Serve from cache, background refresh |
| > 24 hours | Show with "may be outdated" banner, force refresh |
| All mirrors fail | Serve cache with "Offline" banner |

### Contribute flow

```
Login (OSM OAuth 2.0 PKCE — no client secret)
  → Locate (GPS)
  → Form (type / capacity / covered)
  → Review screen (explicit approval gate before any API call)
  → Submit: open changeset → create node → close changeset
  → Show OSM node ID + link
```

A red **LIVE** banner is always visible when `NEXT_PUBLIC_OSM_ENV=production` so you always know which environment you're writing to.

---

## Project Structure

```
bicycle-parking-tracker/
├── app/
│   ├── page.tsx                  # Home — list/map, radius, destination search
│   ├── spot/[id]/page.tsx        # Spot detail + directions
│   ├── contribute/page.tsx       # Contribute flow (6 steps)
│   ├── auth/callback/page.tsx    # OSM OAuth callback
│   ├── sw.ts                     # Serwist service worker
│   └── layout.tsx
├── components/
│   ├── MapView.tsx               # Leaflet map (lazy-loaded)
│   ├── SpotCard.tsx              # Spot card with chips
│   └── RadiusSelector.tsx        # Radius pill buttons
├── hooks/
│   └── useSpots.ts               # Data hook (geolocation, cache, Overpass)
├── lib/
│   ├── overpass.ts               # Overpass query + 4-mirror fallback
│   ├── cache.ts                  # IndexedDB read/write/search
│   ├── geo.ts                    # Haversine distance, formatting
│   ├── nominatim.ts              # Destination geocoding
│   ├── osm-auth.ts               # OAuth 2.0 PKCE flow
│   └── osm-api.ts                # Changeset + node submission
├── types/
│   └── spot.ts                   # BicycleSpot + CachedArea interfaces
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── docs/
    ├── architecture.md           # Detailed design decisions + OSM OAuth credentials
    └── osm-oauth-registered-app.png
```

---

## Deployment

```bash
npm run build    # production build
vercel --prod    # deploy to Vercel
```

Set these env vars in your Vercel project:

```
NEXT_PUBLIC_DEFAULT_LAT=53.0126
NEXT_PUBLIC_DEFAULT_LON=-2.2278
NEXT_PUBLIC_OSM_ENV=production
NEXT_PUBLIC_OSM_CLIENT_ID=<your_client_id>
```

---

## Data Coverage

Default centre: **Newcastle-under-Lyme, UK** (53.0126, -2.2278)

| Metric | Value |
|---|---|
| Spots within 5km | 79 |
| Has capacity tag | 92% |
| Has covered tag | 92% |
| Has parking type | 89% |
| Last edited 2024–2026 | 77% |

---

## OSM Attribution

Data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL](https://opendatacommons.org/licenses/odbl/).
