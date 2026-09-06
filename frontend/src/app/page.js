import Link from "next/link";

const spaces = ["🛋 Living Room","🛏 Bedroom","🍳 Kitchen","🌿 Balcony","🪜 Staircase","🚿 Bathroom","🏡 Terrace","🌳 Garden"];

export default function HomePage() {
  return <>
    <main className="hero">
      <div>
        <div className="eyebrow">AI interior design for your actual home</div>
        <h1>Design every space. <span className="gradient-text">Keep what you love.</span></h1>
        <p>Upload your real room, tell ZYLO what must stay, choose a style and budget, then build a practical redesign plan for your whole house.</p>
        <div className="actions"><Link className="btn" href="/signup">Create my home</Link><Link className="btn secondary" href="/inspiration">Explore ideas</Link></div>
      </div>
      <div className="hero-card">
        <div className="eyebrow">Your digital home</div>
        <h2>One home. Every space.</h2>
        <div className="room-grid">{spaces.map(s=><div className="room-chip" key={s}>{s}</div>)}</div>
      </div>
    </main>
    <section className="section"><h2>From photo to action plan</h2><p className="muted">ZYLO is built to help users decide what to change, not only create a pretty picture.</p><div className="grid">
      <div className="card"><h3>1. Understand</h3><p className="muted">Analyze the current style and organize your house into individual spaces.</p></div>
      <div className="card"><h3>2. Redesign</h3><p className="muted">Choose a target style and describe exactly what should stay, change or be removed.</p></div>
      <div className="card"><h3>3. Plan</h3><p className="muted">Get furniture, lighting, color, material and budget recommendations you can act on.</p></div>
    </div></section>
    <footer className="footer">ZYLO — Analyze ✦ Design ✦ Inspire</footer>
  </>;
}
