import { Router } from "express";
import { POI_SCAN_SCHEMA, ROUTE_SCHEMA, SEARCH_SCHEMA } from "@atlas/validation";
import { fetchRoute, scanPois, searchPlaces } from "../services/external-service.js";
import { fail, ok } from "../utils/responses.js";
export const geospatialRouter=Router();
geospatialRouter.get("/geocode",async(req,res)=>{const p=SEARCH_SCHEMA.safeParse(req.query);if(!p.success)return void fail(res,400,"INVALID_QUERY","Enter at least two characters.");try{ok(res,await searchPlaces(p.data.q))}catch(e){fail(res,502,"GEOCODE_FAILED","Location search is unavailable.",e instanceof Error?e.message:undefined)}});
geospatialRouter.get("/boundaries",async(req,res)=>{const p=SEARCH_SCHEMA.safeParse(req.query);if(!p.success)return void fail(res,400,"INVALID_QUERY","Enter at least two characters.");try{ok(res,await searchPlaces(p.data.q,true))}catch(e){fail(res,502,"BOUNDARY_FAILED","Boundary search is unavailable.",e instanceof Error?e.message:undefined)}});
geospatialRouter.post("/routes",async(req,res)=>{const p=ROUTE_SCHEMA.safeParse(req.body);if(!p.success)return void fail(res,400,"INVALID_ROUTE","Provide 2–50 valid waypoints.");try{ok(res,await fetchRoute(p.data.mode,p.data.waypoints))}catch(e){fail(res,502,"ROUTE_FAILED","Road routing is unavailable.",e instanceof Error?e.message:undefined)}});
geospatialRouter.post("/pois/scan",async(req,res)=>{const p=POI_SCAN_SCHEMA.safeParse(req.body);if(!p.success)return void fail(res,400,"INVALID_SCAN","The POI scan request is invalid.",p.error.flatten());try{ok(res,{pois:await scanPois(p.data.lat,p.data.lon,p.data.radius,p.data.tags)})}catch(e){fail(res,502,"POI_SCAN_FAILED","POI providers are temporarily unavailable.",e instanceof Error?e.message:undefined)}});
