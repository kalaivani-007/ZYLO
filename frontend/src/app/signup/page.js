"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage(){
 const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [msg,setMsg]=useState(""); const [error,setError]=useState(""); const router=useRouter();
 async function submit(e){e.preventDefault();setError("");setMsg("");const {data,error}=await supabase.auth.signUp({email,password,options:{data:{name}}});if(error){setError(error.message);return;}if(data.session) router.push("/dashboard"); else setMsg("Account created. Check your email to confirm, then log in.");}
 return <main className="center-page"><form className="panel auth-card" onSubmit={submit}><div className="eyebrow">Join ZYLO</div><h1>Create account</h1><div className="field"><label>Name</label><input required value={name} onChange={e=>setName(e.target.value)} /></div><div className="field"><label>Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div><div className="field"><label>Password</label><input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div><button className="btn" type="submit">Create my ZYLO account</button>{msg&&<div className="notice">{msg}</div>}{error&&<div className="error">{error}</div>}<p className="muted">Already registered? <Link href="/login">Login</Link></p></form></main>
}
