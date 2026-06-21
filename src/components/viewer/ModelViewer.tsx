"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import type { Group } from "three";

interface ModelProps {
  url: string;
}

function Model({ url }: ModelProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(url);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={scene.clone()} />
      </Center>
    </group>
  );
}

interface ModelViewerProps {
  modelUrl: string | null;
  isLoading?: boolean;
  error?: string | null;
}

export function ModelViewer({ modelUrl, isLoading, error }: ModelViewerProps) {
  if (error) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 text-red-300">
        {error}
      </div>
    );
  }

  if (isLoading || !modelUrl) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">
          Generowanie modelu 3D… To może potrwać 5–10 minut.
        </p>
      </div>
    );
  }

  return (
    <div className="h-96 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <Model url={modelUrl} />
          <Environment preset="studio" />
          <OrbitControls makeDefault enablePan enableZoom />
        </Suspense>
      </Canvas>
    </div>
  );
}
