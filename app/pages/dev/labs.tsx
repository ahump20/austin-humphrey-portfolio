import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { WebGPURenderer } from "three/examples/jsm/renderers/WebGPURenderer.js";

type Renderer = THREE.WebGLRenderer | WebGPURenderer;

export default function Labs(): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parentAtMount = containerRef.current;
    let renderer: Renderer | null = null;
    let animId = 0;
    let resizeHandler: (() => void) | null = null;

    async function init() {
      if (!parentAtMount) {
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, parentAtMount.clientWidth / 540, 0.1, 1000);
      camera.position.set(0, 1.5, 4);

      try {
        const webgpu = await import("three/examples/jsm/renderers/WebGPURenderer.js");
        const gpuRenderer = new webgpu.WebGPURenderer({ antialias: true });
        await gpuRenderer.init();
        gpuRenderer.domElement.style.width = "100%";
        gpuRenderer.domElement.style.height = "540px";
        parentAtMount.appendChild(gpuRenderer.domElement);
        renderer = gpuRenderer;
      } catch (error) {
        console.warn("WebGPU unavailable, falling back to WebGL", error);
        const webglRenderer = new THREE.WebGLRenderer({ antialias: true });
        webglRenderer.setSize(parentAtMount.clientWidth, 540);
        parentAtMount.appendChild(webglRenderer.domElement);
        renderer = webglRenderer;
      }

      const zone = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.8, 0.5),
        new THREE.MeshBasicMaterial({ wireframe: true }),
      );
      scene.add(zone);

      const points = new THREE.Group();
      const pointGeometry = new THREE.SphereGeometry(0.03);
      for (let index = 0; index < 200; index += 1) {
        const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6 });
        const mesh = new THREE.Mesh(pointGeometry, material);
        mesh.position.set(
          (Math.random() - 0.5) * 1.0,
          Math.random() * 1.8 - 0.9,
          (Math.random() - 0.5) * 0.5,
        );
        points.add(mesh);
      }
      scene.add(points);

      const light = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(light);

      resizeHandler = () => {
        if (!renderer) {
          return;
        }
        const width = parentAtMount.clientWidth;
        const height = 540;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        if ("setSize" in renderer) {
          renderer.setSize(width, height);
        }

        if ("setPixelRatio" in renderer) {
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
      };

      window.addEventListener("resize", resizeHandler);
      resizeHandler();

      const clock = new THREE.Clock();
      const animate = () => {
        animId = window.requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        zone.rotation.y = elapsed * 0.2;

        if (!renderer) {
          return;
        }

        renderer.render(scene, camera);
      };

      animate();
    }

    init();

    return () => {
      if (animId) {
        cancelAnimationFrame(animId);
      }
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      if (parentAtMount) {
        parentAtMount.innerHTML = "";
      }
    };
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>WebGPU Labs — Baseball</h1>
      <p>Strike zone visualization with auto-fallback to WebGL if WebGPU is unavailable.</p>
      <div ref={containerRef} style={{ width: "100%", height: 540, background: "#0b0b0b", borderRadius: 12 }} />
      <p style={{ fontSize: 12, opacity: 0.8, marginTop: 12 }}>
        Assets: glTF/KTX2/Draco recommended (served from R2). This sample uses simple generated geometry for portability.
      </p>
    </main>
  );
}
