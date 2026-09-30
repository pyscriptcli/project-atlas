# Project Atlas

Enterprise WebGIS & Spatial Analysis Platform re-architected with **Next.js 15 (App Router, TypeScript, Tailwind CSS)** and a **FastAPI (Python)** spatial backend.

---

## 🌟 Repository Architecture & Modular Organization

The repository is organized so that any developer can immediately locate and understand each feature:

```
project-atlas/
├── src/                          # Next.js 15 WebGIS Client
│   ├── app/                      # App Router pages & API routes
│   │   ├── api/ai/insights/      # DeepSeek AI trade area analytics proxy
│   │   ├── api/overpass/         # Overpass API gateway
│   │   └── api/geocode/          # Nominatim geocoding gateway
│   ├── gis/                      # ★ DOMAIN-DRIVEN GIS MODULES
│   │   ├── map.ts                # MapLibre setup, 2D/3D building extrusions, vector themes
│   │   ├── buildings3d.ts        # 3D Building suite, archetype catalog, setbacks
│   │   ├── polygons.ts           # Polygons, rectangles, vertex manipulation, centroid rotation
│   │   ├── circles.ts            # Geodesic circles, Haversine distance, radius resizing
│   │   ├── markers.ts            # Dynamic HTML5 canvas pins, sprites, custom image pin upload
│   │   ├── routes.ts             # Multi-point OSRM routing, intermediate waypoints, rerouting
│   │   ├── labels.ts             # Text labels, halo effects, dynamic offsets
│   │   ├── tradeArea.ts          # POI category taxonomy, polygon clipping, Overpass failover
│   │   ├── layers.ts             # Custom groups, drag-and-drop layer reordering, bulk styling
│   │   ├── attributes.ts         # Tabular schema, custom columns, image cells, cell updates
│   │   └── importExport.ts       # KML, KMZ, GeoJSON, Shapefile (.zip) import & high-res PNG export
│   │
│   ├── components/
│   │   ├── map/                  # Canvas, right-click context menu, feature inspection popup
│   │   ├── toolbar/              # Floating top action bar, color palette picker
│   │   ├── panels/               # Data Browser (layer visibilities) & My Layers (hierarchy)
│   │   └── modals/               # Shape editor, Trade Area analysis + AI, Attributes table, Basemaps
│   │
│   ├── store/                    # Zustand stores (useMapStore, useProjectStore)
│   └── types/                    # Strict TypeScript definitions (gis.ts)
│
├── backend/                      # Python FastAPI Spatial Engine
│   ├── app/
│   │   ├── api/
│   │   │   ├── overpass.py       # Robust Overpass queries with multi-endpoint failover & OSMnx fallback
│   │   │   ├── osmnx_analytics.py# OSMnx street networks & isochrone walk/drive reachability
│   │   │   └── routing.py        # OSRM routing gateway
│   │   └── main.py               # FastAPI application entry point
│   ├── requirements.txt
│   └── Dockerfile
│
├── package.json                  # Next.js dependencies & scripts (Root Vercel ready)
└── tsconfig.json
```

---

## 🚀 Quick Start Guide

### 1. WebGIS Client (Next.js)

```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!NOTE]
> The frontend works standalone! If the FastAPI backend is not running, Next.js route handlers (`/api/overpass`, `/api/route`, `/api/geocode`) automatically handle spatial requests.

### 2. Backend Setup (FastAPI & Python GIS)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
The FastAPI documentation and interactive OpenAPI interface will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 🗺️ Key Features & Capabilities

- **3D Vector Tile Basemap**: OpenFreeMap vector planet tiles with 3 custom themes (*Midnight Blue*, *Monochrome*, *White Gold*) plus raster fallbacks (CartoDB, OSM, Satellite).
- **Interactive Vector Drawing**: Polygons, rectangles, geodesic circles with radius handles, polylines, markers with 7 procedural canvas shapes + custom image upload, text annotations, and OSRM routing.
- **Transformation Engine**: Vertex dragging, whole-feature translation, centroid rotation with gold handle, and Z-ordering (*Bring to Front* / *Send to Back*).
- **Trade Area Scanner**: Select any drawn polygon/circle to scan and categorize OpenStreetMap POIs across 8 macro-sectors with point-in-polygon clipping.
- **Dynamic Attribute Table**: Spreadsheet editor per feature with support for text and image cells, custom column creation, row additions, and inline image uploads.
- **Cloud Persistence**: Integrated with Supabase (`map_projects` table) with auto-save every 20 seconds and `Ctrl+S` quick save.

### Editor access and published viewers

Set `SUPABASE_SERVICE_ROLE_KEY`, `ATLAS_EDITOR_PASSWORD=atlas`, and a long random `ATLAS_SESSION_SECRET` as server-only environment variables (for example, generate the session secret with `openssl rand -base64 32`). The editor login accepts an email in the `@primephilippines.com` domain and checks the shared password on the server. The email is not independently verified; it is an access label for the shared editor credential.

Editor sign-in is currently disabled unless `ATLAS_EDITOR_AUTH_ENABLED=true`. In this open mode, visitors have editor access. Set it to `true` to restore the sign-in gate.

Apply `supabase/migrations/202609300001_published_project_view_links.sql` before enabling the new login. It creates published snapshot storage and removes direct browser access to `map_projects`; project persistence now goes through authenticated server routes. Never prefix service-role or session secrets with `NEXT_PUBLIC_`.

Use the share button in the editor toolbar to publish a stable, view-only link. Overview captures the current map camera; named stops capture additional camera positions and can be reordered. Republish updates the snapshot at the same URL; revoke disables that URL. Viewer routes expose only the published snapshot and have no project save or editing controls.
- **Keyboard Shortcuts**:
  - `Ctrl + S`: Save workspace
  - `Ctrl + Z`: Undo
  - `Ctrl + Y` / `Ctrl + Shift + Z`: Redo
  - `Escape`: Cancel active tool or close context menu
