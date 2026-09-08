import { Router } from "express";
import { PROJECT_ID_SCHEMA, PROJECT_INPUT_SCHEMA } from "@atlas/validation";
import { createProject, deleteProject, listProjects, updateProject } from "../services/projects-service.js";
import { fail, ok } from "../utils/responses.js";
export const projectsRouter=Router();
projectsRouter.get("/",async(req,res)=>{const{data,error}=await listProjects(req.accessToken!);return error?fail(res,500,"PROJECT_LIST_FAILED",error.message):ok(res,data??[])});
projectsRouter.post("/",async(req,res)=>{const parsed=PROJECT_INPUT_SCHEMA.safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_FAILED","Invalid project payload",parsed.error.flatten());const{data,error}=await createProject(req.accessToken!,req.userId!,parsed.data);return error?fail(res,500,"PROJECT_CREATE_FAILED",error.message):ok(res,data,201)});
projectsRouter.patch("/:id",async(req,res)=>{const id=PROJECT_ID_SCHEMA.safeParse(req.params.id);const body=PROJECT_INPUT_SCHEMA.partial().safeParse(req.body);if(!id.success||!body.success)return fail(res,400,"VALIDATION_FAILED","Invalid project update");const{data,error}=await updateProject(req.accessToken!,id.data,body.data);return error?fail(res,500,"PROJECT_UPDATE_FAILED",error.message):ok(res,data)});
projectsRouter.delete("/:id",async(req,res)=>{const id=PROJECT_ID_SCHEMA.safeParse(req.params.id);if(!id.success)return fail(res,400,"VALIDATION_FAILED","Invalid project id");const{error}=await deleteProject(req.accessToken!,id.data);return error?fail(res,500,"PROJECT_DELETE_FAILED",error.message):ok(res,{deleted:true})});
