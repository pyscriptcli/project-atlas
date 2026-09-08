import { z } from "zod";
const ENV_SCHEMA = z.object({NODE_ENV:z.enum(["development","test","production"]).default("development"),PORT:z.coerce.number().default(3001),FRONTEND_ORIGIN:z.string().url(),SUPABASE_URL:z.string().url(),SUPABASE_ANON_KEY:z.string().min(20),SUPABASE_SERVICE_ROLE_KEY:z.string().min(20)});
export const env = ENV_SCHEMA.parse(process.env);
