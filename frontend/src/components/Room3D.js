"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";

const P = {
  Modern:["#f0eee9","#b88d62","#343238","#8c5d3d","#caa65b"],
  Minimalist:["#f5f3ee","#c7ad8d","#9b9288","#b79b7a","#cbb993"],
  Scandinavian:["#f7f4ed","#d3b58e","#9aaa94","#c7a477","#d6bd7f"],
  Industrial:["#c7c4bf","#775f4d","#575255","#7b523a","#b77447"],
  Boho:["#eee1d1","#aa7654","#a36759","#9b6747","#c99550"]
};

function B({p,s,c}) {
  return <mesh position={p} castShadow receiveShadow>
    <boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.72}/>
  </mesh>;
}

function Model({file,p=[0,0,0],r=[0,0,0],s=2.15}) {
  const {scene}=useGLTF(`/GLTF%20format/${file}`);
  const clone=useMemo(()=>{
    const x=scene.clone(true);
    x.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    return x;
  },[scene]);
  return <primitive object={clone} position={p} rotation={r} scale={s}/>;
}

function hash(s=""){
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function rng(seed){let x=seed||1;return()=>((x=Math.imul(1664525,x)+1013904223>>>0)/4294967296);}
function jitter(rand,n=.35){return (rand()-.5)*n*2;}

function Living({rand}) {
  return <group>
    <Model file="loungeSofa.glb" p={[jitter(rand,.25),0,1.25]} r={[0,Math.PI,0]} s={2.35}/>
    <Model file="tableCoffee.glb" p={[jitter(rand,.2),0,-.35]} s={2.15}/>
    <Model file="cabinetTelevision.glb" p={[1.65,0,-2.35]} s={2.0}/>
    <Model file="televisionModern.glb" p={[1.65,1.02,-2.30]} s={1.7}/>
    <Model file="lampRoundFloor.glb" p={[-2.25,0,1.55]} s={2.0}/>
    <Model file="pottedPlant.glb" p={[2.25,0,1.65]} s={2.0}/>
    <Model file="rugRectangle.glb" p={[0,.02,-.2]} s={2.3}/>
  </group>;
}
function Bedroom({rand}) {
  return <group>
    <Model file="bedDouble.glb" p={[jitter(rand,.25),0,.35]} s={2.15}/>
    <Model file="cabinetBedDrawerTable.glb" p={[-2.05,0,-1.75]} s={2.0}/>
    <Model file="lampRoundTable.glb" p={[-2.05,.82,-1.75]} s={1.65}/>
    <Model file="bookcaseClosed.glb" p={[2.15,0,-2.25]} s={1.85}/>
    <Model file="rugRectangle.glb" p={[0,.02,1.45]} s={2.15}/>
  </group>;
}
function Kitchen({rand}) {
  return <group>
    <Model file="kitchenCabinet.glb" p={[-1.75,0,-2.45]} s={2.0}/>
    <Model file="kitchenSink.glb" p={[-.35,0,-2.45]} s={2.0}/>
    <Model file="kitchenStove.glb" p={[1.05,0,-2.45]} s={2.0}/>
    <Model file="kitchenFridge.glb" p={[2.25,0,-2.4]} s={2.0}/>
    <Model file="tableRound.glb" p={[.2,0,.8]} s={1.85}/>
    <Model file="chair.glb" p={[-1.15,0,.8]} r={[0,Math.PI/2,0]} s={1.8}/>
    <Model file="chair.glb" p={[1.55,0,.8]} r={[0,-Math.PI/2,0]} s={1.8}/>
  </group>;
}
function Dining(){
  return <group>
    <Model file="table.glb" p={[0,0,.2]} s={2.1}/>
    <Model file="chair.glb" p={[-1.65,0,.2]} r={[0,Math.PI/2,0]} s={1.9}/>
    <Model file="chair.glb" p={[1.65,0,.2]} r={[0,-Math.PI/2,0]} s={1.9}/>
    <Model file="chair.glb" p={[0,0,-1.35]} s={1.9}/>
    <Model file="chair.glb" p={[0,0,1.75]} r={[0,Math.PI,0]} s={1.9}/>
    <Model file="lampSquareCeiling.glb" p={[0,2.45,.2]} s={1.7}/>
  </group>;
}
function Bathroom(){
  return <group>
    <Model file="bathroomSink.glb" p={[-1.9,0,-2.25]} s={2.0}/>
    <Model file="bathroomMirror.glb" p={[-1.9,1.35,-2.82]} s={1.8}/>
    <Model file="toilet.glb" p={[.2,0,-2.15]} s={2.0}/>
    <Model file="bathtub.glb" p={[1.65,0,.65]} r={[0,Math.PI/2,0]} s={2.0}/>
  </group>;
}
function Study(){
  return <group>
    <Model file="table.glb" p={[0,0,-1.35]} s={1.8}/>
    <Model file="chairDesk.glb" p={[0,0,.15]} r={[0,Math.PI,0]} s={1.9}/>
    <Model file="laptop.glb" p={[0,.9,-1.25]} s={1.55}/>
    <Model file="bookcaseOpen.glb" p={[2.15,0,-2.2]} s={1.85}/>
    <Model file="lampSquareTable.glb" p={[-.9,.9,-1.25]} s={1.45}/>
  </group>;
}
function Outdoor(){
  return <group>
    <Model file="benchCushion.glb" p={[0,0,1.2]} r={[0,Math.PI,0]} s={2.15}/>
    <Model file="tableRound.glb" p={[0,0,-.55]} s={1.65}/>
    <Model file="plantSmall1.glb" p={[-2.15,0,-1.75]} s={2.0}/>
    <Model file="plantSmall2.glb" p={[2.1,0,-1.7]} s={2.0}/>
    <Model file="plantSmall3.glb" p={[2.35,0,1.65]} s={2.0}/>
  </group>;
}
function Staircase(){return <group><Model file="stairs.glb" p={[0,0,0]} s={2.15}/><Model file="pottedPlant.glb" p={[2.15,0,-1.9]} s={1.8}/></group>}

function Furniture({type,rand}){
  const t=(type||"").toLowerCase();
  if(t.includes("bed")||t.includes("kids")) return <Bedroom rand={rand}/>;
  if(t.includes("kitchen")) return <Kitchen rand={rand}/>;
  if(t.includes("dining")) return <Dining/>;
  if(t.includes("bath")) return <Bathroom/>;
  if(t.includes("study")||t.includes("office")) return <Study/>;
  if(t.includes("balcony")||t.includes("terrace")||t.includes("garden")||t.includes("outdoor")) return <Outdoor/>;
  if(t.includes("stair")) return <Staircase/>;
  return <Living rand={rand}/>;
}

function Room({type,c,seed}){
  const rand=useMemo(()=>rng(seed),[seed]);
  return <group>
    <B p={[0,-.08,0]} s={[7,.16,6.6]} c={c[1]}/>
    <B p={[0,1.65,-3.3]} s={[7,3.3,.12]} c={c[0]}/>
    <B p={[-3.45,1.65,0]} s={[.12,3.3,6.6]} c={c[0]}/>
    <B p={[1.7,1.7,-3.22]} s={[2.2,1.45,.05]} c="#9ec5d3"/>
    <Furniture type={type} rand={rand}/>
  </group>;
}

function Home({c,seed}){
  return <group>
    <B p={[0,-.08,0]} s={[11,.16,8.4]} c={c[1]}/>
    <B p={[0,1.5,-4.15]} s={[11,3,.12]} c={c[0]}/>
    <B p={[-5.45,1.5,0]} s={[.12,3,8.4]} c={c[0]}/>
    <B p={[0,1.15,-.8]} s={[.12,2.3,6.6]} c={c[0]}/>
    <B p={[2.75,1.15,1.35]} s={[5.5,2.3,.12]} c={c[0]}/>
    <group position={[-2.7,0,1.2]} scale={.72}><Living rand={rng(seed+1)}/></group>
    <group position={[2.6,0,-2.15]} scale={.72}><Bedroom rand={rng(seed+2)}/></group>
    <group position={[-2.7,0,-2.45]} scale={.68}><Kitchen rand={rng(seed+3)}/></group>
    <group position={[2.65,0,2.55]} scale={.7}><Dining/></group>
  </group>;
}

function Loading3D(){
  return <mesh position={[0,.3,0]}><boxGeometry args={[.6,.6,.6]}/><meshStandardMaterial color="#b88d62"/></mesh>;
}

export default function Room3D({
  spaceType="Living Room",targetStyle="Modern",budget=0,
  intensity="Balanced Redesign",recommendations=[],generatedImage=""
}){
  const c=P[targetStyle]||P.Modern;
  const [whole,setWhole]=useState(false);
  const [view,setView]=useState("iso");
  const signature=JSON.stringify({spaceType,targetStyle,budget,intensity,recommendations,generatedImage});
  const seed=hash(signature);
  const cam=view==="top"?[.1,13.5,.1]:view==="room"?[0,2.7,8.8]:[9.2,7.6,10.4];

  return <div className="zylo-3d-shell">
    <div className="zylo-3d-head"><div>
      <span className="tag">Project-specific interactive design</span>
      <h3>{whole?"ZYLO Home Layout":targetStyle+" "+spaceType}</h3>
      <p className="muted">{intensity} · ₹{Number(budget).toLocaleString()} · layout #{String(seed).slice(-5)}</p>
    </div><div className="zylo-3d-live"><span/> LIVE 3D</div></div>

    <div className="zylo-3d-toolbar">
      <button className="btn secondary" onClick={()=>setView("iso")}>Isometric</button>
      <button className="btn secondary" onClick={()=>setView("top")}>Top view</button>
      <button className="btn secondary" onClick={()=>setView("room")}>Room view</button>
      <button className="btn" onClick={()=>setWhole(v=>!v)}>{whole?"Show this space":"Whole-home demo"}</button>
    </div>

    <div className="viewer3d zylo-isometric-view">
      <Canvas shadows dpr={[1,1.5]} camera={{position:cam,fov:40}}>
        <color attach="background" args={["#c7c9cd"]}/>
        <ambientLight intensity={1.25}/>
        <hemisphereLight intensity={.9}/>
        <directionalLight position={[6,10,8]} intensity={2.4} castShadow/>
        <Suspense fallback={<Loading3D/>}>
          {whole?<Home c={c} seed={seed}/>:<Room type={spaceType} c={c} seed={seed}/>}
        </Suspense>
        <ContactShadows position={[0,-.01,0]} opacity={.34} scale={16} blur={2.4}/>
        <OrbitControls enableDamping target={[0,.55,0]} minDistance={4} maxDistance={20}/>
      </Canvas>
      <div className="zylo-3d-hint">Drag to orbit · Scroll to zoom</div>
    </div>
    <p className="muted zylo-3d-note">3D layout is generated from this project's room type, style, budget, redesign intensity and recommendations. Dimensions remain illustrative unless measurements are supplied.</p>
  </div>;
}
