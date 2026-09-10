# Project Atlas

Enterprise WebGIS & Spatial Analysis Platform re-architected with **Next.js 15 (App Router, TypeScript, Tailwind CSS)** and a **FastAPI (Python)** spatial backend.

---

## 🌟 Repository Architecture & Modular Organization

The repository is organized so that any developer can immediately locate and understand each feature:

```
project-atlas/
├── frontend/                     # Next.js 15 WebGIS Client
│   ├── src/
│   │   ├── gis/                  # ★ DOMAIN-DRIVEN GIS MODULES
│   │   │   ├── map.ts            # MapLibre setup, 2D/3D building extrusions, vector themes
│   │   │   ├── polygons.ts       # Polygons, rectangles, vertex manipulation, centroid rotation
│   │   │   ├── circles.ts        # Geodesic circles, Haversine distance, radius resizing
│   │   │   ├── markers.ts        # Dynamic HTML5 canvas pins, sprites, custom image pin upload
│   │   │   ├── routes.ts         # Multi-point OSRM routing, intermediate waypoints, rerouting
│   │   │   ├── labels.ts         # Text labels, halo effects, dynamic offsets (top, bottom, etc.)
│   │   │   ├── tradeArea.ts      # POI category taxonomy, polygon clipping, Overpass failover
│   │   │   ├── layers.ts         # Custom groups, drag-and-drop layer reordering, bulk styling
│   │   │   ├── attributes.ts     # Tabular schema, custom columns, image cells, cell updates
│   │   │   └── importExport.ts   # KML, KMZ, GeoJSON, Shapefile (.zip) import & high-res PNG export
│   │   │
│   │   ├── components/
│   │   │   ├── map/              # Canvas, right-click context menu, feature inspection popup
│   │   │   ├── toolbar/          # Floating top action bar, color palette picker
│   │   │   ├── panels/           # Data Browser (layer visibilities) & My Layers (hierarchy)
│   │   │   └── modals/           # Shape editor, Trade Area analysis, Attributes table, Basemaps
│   │   │
│   │   ├── store/                # Zustand stores (useMapStore, useProjectStore)
│   │   └── types/                # Strict TypeScript definitions (gis.ts)
│
└── backend/                      # Python FastAPI Spatial Engine
    ├── app/
    │   ├── api/
    │   │   ├── overpass.py       # Robust Overpass queries with multi-endpoint failover & OSMnx fallback
    │   │   ├── osmnx_analytics.py# OSMnx street networks & isochrone walk/drive reachability
    │   │   └── routing.py        # OSRM routing gateway
    │   └── main.py               # FastAPI application entry point
    ├── requirements.txt
    └── Dockerfile
```

---

## 🚀 Quick Start Guide

### 1. Frontend Setup (Next.js)

```bash
cd frontend
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
- **Keyboard Shortcuts**:
  - `Ctrl + S`: Save workspace
  - `Ctrl + Z`: Undo
  - `Ctrl + Y` / `Ctrl + Shift + Z`: Redo
  - `Escape`: Cancel active tool or close context menu
