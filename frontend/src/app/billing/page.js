"use client";
import {useEffect,useState} from "react";
import Protected from "@/components/Protected";
import {apiFetch} from "@/lib/api";

function BillingPage(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(""),[error,setError]=useState(""),[msg,setMsg]=useState("");
 async function load(){try{setData(await apiFetch("/api/billing"));}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 function loadRazorpay(){return new Promise(resolve=>{if(window.Razorpay)return resolve(true);const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.body.appendChild(s)})}
 async function buy(id){setBusy(id);setError("");setMsg("");try{
  const f=new FormData();f.append("pack_id",id);const o=await apiFetch("/api/billing/create-order",{method:"POST",body:f});
  if(!await loadRazorpay())throw new Error("Could not load Razorpay Checkout.");
  new window.Razorpay({key:o.key_id,amount:o.amount,currency:o.currency,name:"ZYLO",description:`${o.pack.name} — ${o.pack.credits} AI credits`,order_id:o.order_id,
   handler:async r=>{try{const v=new FormData();v.append("razorpay_order_id",r.razorpay_order_id);v.append("razorpay_payment_id",r.razorpay_payment_id);v.append("razorpay_signature",r.razorpay_signature);const result=await apiFetch("/api/billing/verify",{method:"POST",body:v});setMsg(result.already_verified ? `Payment already verified. Your balance is ${result.balance} credits.` : `Payment verified. ${result.credits_added||0} credits added. New balance: ${result.balance} credits.`);await load()}catch(e){setError(e.message)}}}).open();
 }catch(e){setError(e.message)}finally{setBusy("")}}
 return <main className="workspace">
  <div className="workspace-header"><div><div className="eyebrow">ZYLO Plan</div><h1>AI generation credits</h1><p className="muted">Planning and visual-instruction preview stay free. One successful Visual AI redesign uses one ZYLO credit.</p></div><span className="tag">2.9</span></div>
  {error&&<div className="error">{error}</div>}{msg&&<div className="notice">{msg}</div>}
  <section className="card"><div className="eyebrow">Your balance</div><h2>{data?data.balance:"…"} credits</h2><p className="muted">New accounts receive {data?.free_starting_credits??3} starter credits. Credits are deducted only after a successful generated image.</p></section>
  <section className="grid" style={{marginTop:22}}>
   <article className="card"><div className="eyebrow">Free</div><h2>₹0</h2><h3>3 starting credits</h3><p className="muted">Try Visual AI plus planning, budget and inspiration.</p></article>
   {Object.entries(data?.packs||{}).map(([id,p])=><article className="card" key={id}><div className="eyebrow">{p.name}</div><h2>₹{p.price_inr}</h2><h3>{p.credits} AI credits</h3><p className="muted">One credit = one successful Visual AI redesign.</p><button className="btn" disabled={!!busy||!data?.payments_ready} onClick={()=>buy(id)}>{busy===id?"Opening checkout…":`Buy ${p.credits} credits`}</button></article>)}
  </section>
  {data&&!data.payments_ready&&<section className="card" style={{marginTop:22}}><h3>Payment test setup pending</h3><p className="muted">Add Razorpay Test Mode keys to the backend before testing checkout. Do not use live keys yet.</p></section>}
  <section className="card" style={{marginTop:22}}><h3>Credit usage</h3><p className="muted">Purchased: {data?.lifetime_purchased??0} · Used: {data?.lifetime_used??0}</p></section>
 </main>
}
export default function Page(){return <Protected><BillingPage/></Protected>}
