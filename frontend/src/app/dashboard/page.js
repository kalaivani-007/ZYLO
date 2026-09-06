"use client";
import Protected from "@/components/Protected";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function Dashboard(){
 const [homes,setHomes]=useState([]); const [name,setName]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [creating,setCreating]=useState(false);
 async function load(){setLoading(true);setError("");const {data,error}=await supabase.from("homes").select("*, spaces(count)").order("created_at",{ascending:false});if(error)setError(error.message);else setHomes(data||[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 async function addHome(e){e.preventDefault();const clean=name.trim();if(!clean||creating)return;setCreating(true);setError("");const {data:{session}}=await supabase.auth.getSession();const user=session?.user;if(!user){setError("Please log in again.");setCreating(false);return;}const {data,error}=await supabase.from("homes").insert({user_id:user.id,name:clean}).select("*").single();if(error)setError(error.message);else{setName("");setHomes(current=>[{...data,spaces:[{count:0}]},...current])}setCreating(false)}
 return <main className="workspace"><div className="workspace-header"><div><div className="eyebrow">Whole-house workspace</div><h1>My Homes</h1><p className="muted">Create one home and add every room, balcony, staircase or outdoor area inside it.</p></div></div><form className="panel card" onSubmit={addHome} style={{maxWidth:620,marginTop:20}}><h3>Create a home</h3><div className="field"><input placeholder="Example: My Chennai Home" value={name} onChange={e=>setName(e.target.value)} /></div><button className="btn" disabled={creating}>{creating?"Creating…":"+ Create home"}</button></form>{error&&<div className="error">{error}</div>}<div className="grid">{loading?<div className="card">Loading…</div>:homes.length===0?<div className="card"><h3>Your first home starts here</h3><p className="muted">Create a home above, then add individual spaces.</p></div>:homes.map(h=><Link className="card" href={`/home/${h.id}`} key={h.id}><div className="space-icon">🏠</div><h3>{h.name}</h3><p className="muted">{h.spaces?.[0]?.count||0} spaces</p><span className="tag">Open home →</span></Link>)}</div></main>
}
export default function Page(){return <Protected><Dashboard/></Protected>}
