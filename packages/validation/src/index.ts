import { z } from "zod";

export const PROJECT_ID_SCHEMA = z.string().uuid();
export const CAMERA_SCHEMA = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const PROJECT_INPUT_SCHEMA = z.object({
  name: z.string().trim().min(1).max(120),
  basemap: z.string().min(1).max(40), center: CAMERA_SCHEMA,
  zoom: z.number().min(0).max(24), pitch: z.number().min(0).max(85), bearing: z.number().min(-360).max(360),
  features: z.array(z.record(z.string(), z.unknown())).max(25000),
  custom_groups: z.record(z.string(), z.unknown()), layer_visibilities: z.record(z.string(), z.boolean()),
  style_overrides: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  group_order: z.array(z.string()).optional(), schema_version: z.number().int().positive().default(2)
});
export const POI_SCAN_SCHEMA = z.object({lat:z.number().min(-90).max(90),lon:z.number().min(-180).max(180),radius:z.number().int().min(50).max(25000),tags:z.array(z.string().regex(/^[a-zA-Z0-9_:]+(?:[=~][a-zA-Z0-9_|: -]+)?$/)).min(1).max(100)});
export const SEARCH_SCHEMA = z.object({q:z.string().trim().min(2).max(200)});
export const ROUTE_SCHEMA = z.object({mode:z.enum(["driving","walking","cycling"]),waypoints:z.array(CAMERA_SCHEMA).min(2).max(50)});
