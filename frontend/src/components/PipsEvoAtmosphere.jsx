import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { usePipsReducedMotion } from "@/lib/motionPreference";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    float time = uTime * 0.035;
    float cloud = noise(uv * 3.0 + vec2(time, -time * 0.45));
    cloud += noise(uv * 5.7 - vec2(time * 0.35, time * 0.25)) * 0.45;
    vec2 purpleCenter = vec2(0.70, 0.48);
    vec2 blueCenter = vec2(0.83, 0.68);
    float purpleGlow = smoothstep(0.72, 0.02, distance(uv, purpleCenter));
    float blueGlow = smoothstep(0.58, 0.02, distance(uv, blueCenter));
    vec3 base = vec3(0.006, 0.008, 0.018);
    vec3 purple = vec3(0.20, 0.055, 0.45) * purpleGlow * (0.42 + cloud * 0.32);
    vec3 blue = vec3(0.025, 0.18, 0.42) * blueGlow * (0.25 + cloud * 0.24);
    float vignette = smoothstep(0.86, 0.28, distance(uv, vec2(0.58, 0.5)));
    gl_FragColor = vec4((base + purple + blue) * vignette * uIntensity, 1.0);
  }
`;

class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function AtmosphericPlane({ active, intensity }) {
  const materialRef = useRef(null);
  const viewport = useThree((state) => state.viewport);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uIntensity: { value: intensity } }), [intensity]);
  useFrame((state) => {
    if (active && materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh position={[0, 0, 0]} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={materialRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} depthWrite={false} />
    </mesh>
  );
}

function BackgroundParticles({ count, active }) {
  const pointsRef = useRef(null);
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const seed = (index * 16807) % 2147483647;
      values[index * 3] = ((seed % 997) / 997 - 0.5) * 4.8;
      values[index * 3 + 1] = (((seed * 17) % 991) / 991 - 0.5) * 2.7;
      values[index * 3 + 2] = -0.4 - (((seed * 31) % 983) / 983) * 1.8;
    }
    return values;
  }, [count]);

  useFrame((_, delta) => {
    if (active && pointsRef.current) pointsRef.current.rotation.z += delta * 0.0035;
  });

  return (
    <points ref={pointsRef} position={[0.45, 0, 0]}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#8E70FF" size={0.008} transparent opacity={0.2} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function detectQuality(reducedMotion) {
  if (reducedMotion) return "css-fallback";
  const width = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;
  const memory = navigator.deviceMemory || 4;
  if (width < 640 || memory <= 2) return "low";
  if (width < 1180 || dpr > 2 || memory <= 4) return "medium";
  return "high";
}

export default function PipsEvoAtmosphere({ className = "" }) {
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(!document.hidden);
  const reducedMotion = usePipsReducedMotion();
  const [quality, setQuality] = useState(() => detectQuality(reducedMotion));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "160px" });
    observer.observe(root);
    const handleVisibility = () => setDocumentVisible(!document.hidden);
    const handleResize = () => setQuality(detectQuality(reducedMotion));
    handleResize();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
    };
  }, [reducedMotion]);

  const active = visible && documentVisible && !reducedMotion;
  const useCanvas = quality !== "css-fallback";
  const particleCount = quality === "high" ? 72 : quality === "medium" ? 38 : 0;

  return (
    <div ref={rootRef} className={`pipsevo-atmosphere ${className}`} aria-hidden="true" data-quality={quality}>
      <div className="pipsevo-atmosphere__fallback" />
      {useCanvas && (
        <WebGLErrorBoundary>
          <Canvas
            className="pipsevo-atmosphere__canvas"
            camera={{ position: [0, 0, 1], fov: 50 }}
            dpr={[1, quality === "high" ? 1.5 : 1.2]}
            frameloop={active ? "always" : "demand"}
            gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          >
            <AtmosphericPlane active={active} intensity={quality === "low" ? 0.72 : 1} />
            {particleCount > 0 && <BackgroundParticles count={particleCount} active={active} />}
          </Canvas>
        </WebGLErrorBoundary>
      )}
      <div className="pipsevo-atmosphere__noise" />
      <div className="pipsevo-atmosphere__vignette" />
    </div>
  );
}
