import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
export const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
export const userClient = (token: string) => createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
