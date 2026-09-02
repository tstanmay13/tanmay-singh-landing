"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useTexture } from "@react-three/drei";
import { BackSide, Quaternion, SRGBColorSpace, Vector3 } from "three";
import type { CatalogCity } from "@/content/travel/types";
import {
  GLOBE_RADIUS,
  PIN_RADIUS,
  latLngToVector3,
  lodBand,
  pinScale,
  type LodBand,
} from "@/lib/travel/geo";

const UP = new Vector3(0, 1, 0);

type GlobeProps = {
  cities: CatalogCity[];
  selectedId: string | null;
  autoRotate: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onBand: (band: LodBand) => void;
};

export default function SouvenirGlobe(props: GlobeProps) {
  return (
    <Canvas
      camera={{ position: [2.4, 1.1, 3.6], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.75]}
      style={{ background: "transparent" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMappingExposure = 1.35;
      }}
    >
      <ambientLight intensity={0.95} />
      <hemisphereLight args={["#f4ead0", "#243848", 0.85]} />
      <directionalLight position={[3.2, 2.4, 4]} intensity={2.4} color="#fff6e4" />
      <directionalLight position={[-3, 0.8, -2]} intensity={0.7} color="#7ea0b4" />
      <Scene {...props} />
    </Canvas>
  );
}

function Scene({
  cities,
  selectedId,
  autoRotate,
  onSelect,
  onHover,
  onBand,
}: GlobeProps) {
  return (
    <>
      <LodWatch onBand={onBand} />
      <Earth />
      <Meridian />
      <Stand />
      {cities.map((city) => (
        <CityPin
          key={city.id}
          city={city}
          selected={city.id === selectedId}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <ContactShadows
        position={[0, -1.62, 0]}
        opacity={0.42}
        scale={7}
        blur={2.6}
        far={2.8}
      />
      <OrbitControls
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={0.35}
        minDistance={1.9}
        maxDistance={5.2}
        minPolarAngle={0.55}
        maxPolarAngle={Math.PI / 1.62}
        rotateSpeed={0.55}
        zoomSpeed={0.65}
      />
    </>
  );
}

function LodWatch({ onBand }: { onBand: (band: LodBand) => void }) {
  const last = useRef<LodBand | null>(null);

  useFrame(({ camera }) => {
    const next = lodBand(camera.position.length());
    if (last.current === next) return;
    last.current = next;
    onBand(next);
  });

  return null;
}

function Earth() {
  const texture = useTexture("/travel/earth.jpg");
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.42} metalness={0} />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#8fb0a8" transparent opacity={0.11} side={BackSide} />
      </mesh>
    </group>
  );
}

function Meridian() {
  return (
    <mesh rotation={[0, 0, Math.PI / 2.35]}>
      <torusGeometry args={[GLOBE_RADIUS + 0.03, 0.01, 8, 96]} />
      <meshStandardMaterial
        color="#b0894f"
        metalness={0.82}
        roughness={0.28}
        emissive="#3a2a12"
      />
    </mesh>
  );
}

function Stand() {
  return (
    <group position={[0, -1.48, 0]}>
      <mesh>
        <cylinderGeometry args={[0.34, 0.42, 0.08, 24]} />
        <meshStandardMaterial color="#5a3a28" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 0.38, 12]} />
        <meshStandardMaterial color="#6a4630" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.018, 8, 28]} />
        <meshStandardMaterial color="#b0894f" metalness={0.7} roughness={0.32} />
      </mesh>
    </group>
  );
}

function CityPin({
  city,
  selected,
  onSelect,
  onHover,
}: {
  city: CatalogCity;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const { position, quaternion } = useMemo(() => {
    const position = latLngToVector3(city.lat, city.lng, PIN_RADIUS);
    const quaternion = new Quaternion().setFromUnitVectors(UP, position.clone().normalize());
    return { position, quaternion };
  }, [city.lat, city.lng]);

  const scale = pinScale(city.dwellMs, selected);
  const head = selected ? "#ff5a48" : "#e23b32";

  return (
    <group position={position} quaternion={quaternion} scale={scale}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(city.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(city.id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          onHover(null);
        }}
      >
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.026, 14, 14]} />
        <meshStandardMaterial
          color={head}
          emissive={selected ? "#ff2a18" : "#8a1410"}
          emissiveIntensity={selected ? 0.7 : 0.35}
          roughness={0.32}
          metalness={0.15}
        />
      </mesh>
      <mesh position={[0, -0.036, 0]}>
        <coneGeometry args={[0.007, 0.044, 6]} />
        <meshStandardMaterial color="#b0894f" metalness={0.72} roughness={0.3} />
      </mesh>
    </group>
  );
}
