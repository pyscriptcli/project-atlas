import { userClient } from "../db/supabase.js";
export const listProjects=(token:string)=>userClient(token).from("map_projects").select("*").order("updated_at",{ascending:false});
export const createProject=(token:string,userId:string,input:Record<string,unknown>)=>userClient(token).from("map_projects").insert({...input,owner_id:userId,schema_version:2}).select().single();
export const updateProject=(token:string,id:string,input:Record<string,unknown>)=>userClient(token).from("map_projects").update({...input,updated_at:new Date().toISOString()}).eq("id",id).select().single();
export const deleteProject=(token:string,id:string)=>userClient(token).from("map_projects").delete().eq("id",id);
