"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useState } from "react";

function Room({ autoRotate }) {
  const ref = useRef();
  useFrame((_state, delta) => {
    if (autoRotate && ref.current) ref.current.rotation.y += delta * 0.2;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, -1.2, 0]} receiveShadow><boxGeometry args={[6, .2, 5]} /><meshStandardMaterial color="#b89c7d" /></mesh>
      <mesh position={[0, 1.3, -2.45]}><boxGeometry args={[6, 5, .1]} /><meshStandardMaterial color="#ece7df" /></mesh>
      <mesh position={[-2.95, 1.3, 0]}><boxGeometry args={[.1, 5, 5]} /><meshStandardMaterial color="#f4f0ea" /></mesh>
      <mesh position={[0, -.55, .4]} castShadow><boxGeometry args={[2.7, .9, 1.1]} /><meshStandardMaterial color="#6f54a8" /></mesh>
      <mesh position={[0, -.05, .4]} castShadow><boxGeometry args={[2.8, .2, 1.2]} /><meshStandardMaterial color="#d9d1e8" /></mesh>
      <mesh position={[1.7, -.85, -.1]} castShadow><boxGeometry args={[1.1, .25, .7]} /><meshStandardMaterial color="#7c573f" /></mesh>
      <mesh position={[-1.7, -.3, -1.8]} castShadow><cylinderGeometry args={[.32, .32, 1.8, 24]} /><meshStandardMaterial color="#d6b86b" /></mesh>
    </group>
  );
}

export default function Room3D() {
  const [autoRotate, setAutoRotate] = useState(false);
  return (
    <div>
      <div className="viewer3d">
        <Canvas camera={{ position: [5, 3.5, 7], fov: 45 }} shadows>
          <ambientLight intensity={1.3} />
          <directionalLight position={[4, 8, 6]} intensity={2} castShadow />
          <Room autoRotate={autoRotate} />
          <OrbitControls enableDamping />
        </Canvas>
      </div>
      <button className="btn secondary" onClick={() => setAutoRotate(v => !v)}>{autoRotate ? "Stop walkthrough" : "Start 3D walkthrough"}</button>
      <p className="muted">Interactive V1 prototype. Drag to orbit and scroll to zoom. It is not a photogrammetric reconstruction of the uploaded room.</p>
    </div>
  );
}
