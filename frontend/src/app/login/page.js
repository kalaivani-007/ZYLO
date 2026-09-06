"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage(){
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const router=useRouter();
 async function submit(e){e.preventDefault();setError("");const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setError(error.message);return;}router.push("/dashboard");}
 return <main className="center-page"><form className="panel auth-card" onSubmit={submit}><div className="eyebrow">Welcome back</div><h1>Login</h1><div className="field"><label>Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div><div className="field"><label>Password</label><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div><button className="btn" type="submit">Open my homes</button>{error&&<div className="error">{error}</div>}<p className="muted">New here? <Link href="/signup">Create an account</Link></p></form></main>
}
