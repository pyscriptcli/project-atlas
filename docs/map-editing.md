# Map editing

The frontend owns transient drawing gestures and the editor store owns durable project snapshots. Shared geometry helpers live in `packages/geo`. A completed gesture becomes one history entry; passive camera motion is persisted but not undoable. Basemap changes recreate Atlas feature layers after style readiness.
