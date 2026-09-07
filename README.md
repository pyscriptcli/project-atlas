# Project Atlas: Next-Gen Geospatial Studio

Project Atlas is a high-performance, WebGL-powered geospatial analysis and map-building studio built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **MapLibre GL JS**, **Turf.js**, and **Supabase**.

Re-architected from an early Streamlit prototype to eliminate iframe constraints, achieve 60fps vector rendering, and enable serverless geospatial workflows ready for **Vercel deployment**.

---

## 🚀 Key Features

- **Vector & Raster Basemaps**:
  - OpenFreeMap vector themes: **Midnight Blue** (Dark luxury/cyberpunk), **Monochrome**, and **White Gold**.
  - 3D building fill-extrusions with real building heights from OpenStreetMap data.
  - Raster options: CartoDB Light, CartoDB Dark, OpenStreetMap, ESRI World Imagery Satellite.
- **Geospatial Drawing & Geometry Tools**:
  - Interactive Polygons, Rectangles, Circles (live geodesic radius buffers), Polylines, Marker Pins, Text Labels, and A-to-B routes.
  - Full Undo / Redo history stack.
- **Trade Area & POI Scanner**:
  - Buffer analysis around any target coordinate or landmark.
  - Multi-endpoint failover Overpass API proxy with retry and backoff.
  - Rich POI taxonomy: Commercial & Offices, Retail, F&B, Residential, Industrial & Logistics, Healthcare, Education, and Leisure.
- **Spatial File Imports & Exports**:
  - Import Shapefiles (`.zip`), KML/KMZ (`.kml`, `.kmz`), and GeoJSON (`.geojson`, `.json`).
  - Export feature collections to GeoJSON directly.
- **Attribute Table & Image Attachments**:
  - Spreadsheet-style inspection table with live editing of feature properties, color tags, descriptions, and preview images.
- **Supabase Cloud Persistence**:
  - Workspace management: Create, rename, switch, and delete map projects.
  - Auto-save state sync and PostGIS-compatible schemas.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Glassmorphic UI design
- **Mapping Engine**: [MapLibre GL JS](https://maplibre.org/)
- **Spatial Analysis**: [@turf/turf](https://turfjs.org/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 💻 Getting Started Locally

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/pyscriptcli/project-atlas.git
cd project-atlas
npm install
```

### 2. Configure Environment Variables

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-publishable-key
```

### 3. Setup Supabase Database

Run the SQL migration in `supabase/migrations/20260907_init_map_projects.sql` inside your Supabase SQL Editor.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deploying to Vercel

This repository is pre-configured and tested for zero-configuration Vercel deployment:

1. Push your changes to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), select **Import Project** and choose the `project-atlas` repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Publishable Key
4. Click **Deploy**.

---

## 📁 Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── pois/route.ts       # Overpass API proxy & failover
│   │   ├── geocode/route.ts    # Nominatim place search
│   │   ├── projects/route.ts   # Supabase CRUD handler
│   │   └── export/route.ts     # Spatial export formatter
│   ├── globals.css             # Glassmorphism & dark styles
│   ├── layout.tsx              # Root HTML shell
│   └── page.tsx                # Studio workspace canvas
├── components/
│   ├── map/                    # MapLibre GL engine & controls
│   ├── panels/                 # Floating modals (Trade Area, Layers, Attributes)
│   ├── toolbar/                # Header toolbar & drawing tools
│   └── ui/                     # UI components (Toast, buttons)
├── lib/
│   ├── geo/                    # Turf.js calculations & file parsers
│   ├── map/                    # Themes, styles, & POI taxonomy
│   ├── store/                  # Zustand global state store
│   └── supabase/               # Supabase database clients
└── types/                      # TypeScript definitions
```

---

## 📜 License

MIT
