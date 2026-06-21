"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import type { Group } from "three";

function SceneLights({ lightIntensity }: { lightIntensity: number }) {
  return (
    <>
      <ambientLight intensity={0.3 * lightIntensity} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.9 * lightIntensity}
        castShadow
      />
      <directionalLight
        position={[-3, 2, -4]}
        intensity={0.35 * lightIntensity}
      />
    </>
  );
}

function Model({ url }: { url: string }) {
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
  const [lightIntensity, setLightIntensity] = useState(1);

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
    <div className="flex flex-col gap-4">
      <div className="h-96 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
        <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
          <Suspense fallback={null}>
            <SceneLights lightIntensity={lightIntensity} />
            <Model url={modelUrl} />
            <Environment preset="studio" environmentIntensity={lightIntensity} />
            <OrbitControls makeDefault enablePan enableZoom />
          </Suspense>
        </Canvas>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
        <label className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-zinc-300">Natężenie światła</span>
          <span className="text-zinc-500">{Math.round(lightIntensity * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.05}
          value={lightIntensity}
          onChange={(e) => setLightIntensity(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="mt-1 flex justify-between text-xs text-zinc-600">
          <span>Przyciemnione</span>
          <span>Jasne</span>
        </div>
      </div>
    </div>
  );
}
