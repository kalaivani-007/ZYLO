"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const roomTypes = [
  "All",
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Dining Room",
  "Bathroom",
  "Study / Office",
  "Kids Room",
  "Balcony",
  "Staircase",
  "Entrance / Foyer",
  "Terrace",
  "Garden / Outdoor",
];

const styles = ["All", "Modern", "Minimalist", "Scandinavian", "Industrial", "Boho"];

const ideas = [
  { room:"Living Room", style:"Modern", icon:"🛋", title:"Warm modern living", palette:"Warm White · Walnut · Charcoal", tip:"Keep the main sofa and refresh lighting, rug, wall art and storage.", budget:"₹20k–₹60k" },
  { room:"Living Room", style:"Minimalist", icon:"🛋", title:"Calm minimal lounge", palette:"Soft White · Warm Grey · Light Oak", tip:"Reduce visual clutter and use one strong focal point.", budget:"₹15k–₹45k" },
  { room:"Bedroom", style:"Scandinavian", icon:"🛏", title:"Soft Scandinavian bedroom", palette:"Off White · Light Oak · Sage", tip:"Use layered warm lighting, simple textiles and practical bedside storage.", budget:"₹18k–₹55k" },
  { room:"Bedroom", style:"Boho", icon:"🛏", title:"Relaxed boho bedroom", palette:"Cream · Terracotta · Olive", tip:"Add texture through cushions, natural materials and a small amount of greenery.", budget:"₹15k–₹50k" },
  { room:"Kitchen", style:"Modern", icon:"🍳", title:"Practical modern kitchen", palette:"Warm White · Walnut · Matte Black", tip:"Prioritize task lighting, closed storage and easy-clean finishes.", budget:"₹30k–₹90k" },
  { room:"Dining Room", style:"Modern", icon:"🍽", title:"Focused dining zone", palette:"Warm White · Walnut · Muted Gold", tip:"Center the table visually and add one focused pendant.", budget:"₹20k–₹65k" },
  { room:"Bathroom", style:"Minimalist", icon:"🚿", title:"Clean minimal bathroom", palette:"Soft White · Warm Grey · Black Accent", tip:"Use moisture-safe storage and keep counters visually clear.", budget:"₹20k–₹70k" },
  { room:"Study / Office", style:"Industrial", icon:"💻", title:"Industrial focus workspace", palette:"Concrete Grey · Matte Black · Warm Wood", tip:"Combine ergonomic furniture with glare-free task lighting.", budget:"₹15k–₹50k" },
  { room:"Kids Room", style:"Scandinavian", icon:"🧸", title:"Flexible kids room", palette:"Off White · Light Oak · Dusty Blue", tip:"Choose accessible storage and durable easy-clean finishes.", budget:"₹18k–₹55k" },
  { room:"Balcony", style:"Boho", icon:"🌿", title:"Green boho balcony", palette:"Cream · Terracotta · Natural Rattan", tip:"Use foldable seating, vertical greenery and warm evening lights.", budget:"₹8k–₹30k" },
  { room:"Staircase", style:"Modern", icon:"🪜", title:"Modern staircase accent", palette:"Warm White · Charcoal · Walnut", tip:"Improve step lighting and use the vertical wall as the focal point.", budget:"₹10k–₹40k" },
  { room:"Entrance / Foyer", style:"Minimalist", icon:"🚪", title:"Simple welcoming foyer", palette:"Soft White · Light Oak · Black Accent", tip:"Add slim shoe storage, a mirror and one small landing surface.", budget:"₹10k–₹35k" },
  { room:"Terrace", style:"Industrial", icon:"🏡", title:"Urban terrace retreat", palette:"Concrete Grey · Matte Black · Rust Brown", tip:"Use outdoor-rated seating, lighting and weather-safe materials.", budget:"₹20k–₹75k" },
  { room:"Garden / Outdoor", style:"Scandinavian", icon:"🌳", title:"Simple outdoor calm", palette:"Off White · Light Oak · Sage", tip:"Define pathways and seating while keeping planting low-maintenance.", budget:"₹20k–₹80k" },
];

export default function InspirationPage() {
  const [room, setRoom] = useState("All");
  const [style, setStyle] = useState("All");

  const filtered = useMemo(
    () => ideas.filter((x) => (room === "All" || x.room === room) && (style === "All" || x.style === style)),
    [room, style]
  );

  return (
    <main className="workspace">
      <div className="workspace-header">
        <div>
          <div className="eyebrow">ZYLO Inspiration</div>
          <h1>Find a direction before you redesign.</h1>
          <p className="muted">Explore practical ideas by real space type and interior style, then take that direction into your own ZYLO home.</p>
        </div>
        <Link className="btn" href="/dashboard">Open My Homes</Link>
      </div>

      <section className="card">
        <h3>Explore ideas</h3>
        <div className="two-col">
          <div className="field">
            <label>Space</label>
            <select value={room} onChange={(e) => setRoom(e.target.value)}>
              {roomTypes.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Style</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {styles.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <p className="muted">{filtered.length} idea{filtered.length === 1 ? "" : "s"} shown</p>
      </section>

      <section style={{ marginTop: 22 }}>
        <div className="grid">
          {filtered.map((idea) => (
            <article className="card" key={`${idea.room}-${idea.style}`}>
              <div style={{ fontSize: 42 }}>{idea.icon}</div>
              <div className="eyebrow">{idea.room} · {idea.style}</div>
              <h3>{idea.title}</h3>
              <p><strong>Palette:</strong> {idea.palette}</p>
              <p className="muted">{idea.tip}</p>
              <div className="divider" />
              <p className="muted"><strong>Typical refresh range:</strong> {idea.budget}</p>
              <Link className="btn secondary" href="/dashboard">Use this direction</Link>
            </article>
          ))}
        </div>
      </section>

      {filtered.length === 0 && (
        <section className="card" style={{ marginTop: 22 }}>
          <h3>No exact match yet</h3>
          <p className="muted">Try another style or space. More inspiration combinations can be added without changing your design workspace.</p>
        </section>
      )}

      <section className="card" style={{ marginTop: 22 }}>
        <h2>How inspiration connects to ZYLO</h2>
        <div className="three-col">
          <div><h3>1. Discover</h3><p className="muted">Choose a room and visual direction.</p></div>
          <div><h3>2. Open your home</h3><p className="muted">Select the actual space you want to redesign.</p></div>
          <div><h3>3. Personalize</h3><p className="muted">Use Keep, Change, budget, intensity and Visual AI on your own photo.</p></div>
        </div>
      </section>
    </main>
  );
}
