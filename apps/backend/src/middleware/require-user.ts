import type { NextFunction, Request, Response } from "express";
import { adminClient } from "../db/supabase.js";
import { fail } from "../utils/responses.js";
declare global { namespace Express { interface Request { userId?: string; accessToken?: string; } } }
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return void fail(res, 401, "AUTH_REQUIRED", "A valid session is required.");
  const {data,error}=await adminClient.auth.getUser(token);
  if(error||!data.user) return void fail(res,401,"AUTH_INVALID","The session is invalid or expired.");
  req.userId=data.user.id; req.accessToken=token; next();
}
