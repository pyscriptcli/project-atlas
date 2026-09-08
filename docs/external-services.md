# External geographic services

The backend exclusively calls geocoding, routing, and POI providers. Every request is authenticated and validated. POI scans fail over across providers with timeout, retry, backoff, jitter, and deduplication. The frontend performs final polygon containment so a bounding-radius query cannot add results outside the selected trade area.
