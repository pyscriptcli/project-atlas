"use client";
import { useEffect,useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { AuthScreen } from "./auth-screen";
export function AuthGate({children}:{children:React.ReactNode}){const [session,setSession]=useState<Session|null>(null);const [ready,setReady]=useState(false);useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});const {data}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setReady(true)});return()=>data.subscription.unsubscribe()},[]);if(!ready)return <main className="grid min-h-screen place-items-center bg-[#0a1628] text-slate-300">Loading secure workspace…</main>;return session?<>{children}</>:<AuthScreen/>}
