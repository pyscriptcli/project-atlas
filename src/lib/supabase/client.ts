import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cyczyaswxkpdcremqnkn.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_pUppHGjwmT1mLlhWGZH6Og_4GcCLCPR";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
