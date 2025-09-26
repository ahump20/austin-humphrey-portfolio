/**
 * Blaze Graphics Engine React Component
 * Integrates the hyper-realistic graphics engine into React
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BlazeGraphicsEngine, EngineConfig, EngineStats } from './graphics-engine/core/BlazeGraphicsEngine';
import { GameObject } from './graphics-engine/core/GameObject';
import { Transform } from './graphics-engine/core/Transform';
import { vec3 } from 'gl-matrix';

export interface BlazeGraphicsEngineProps {
  width?: number;
  height?: number;
  enablePhysics?: boolean;
  enableAudio?: boolean;
  performanceMode?: 'quality' | 'balanced' | 'performance';
  onEngineReady?: (engine: BlazeGraphicsEngine) => void;
  onStatsUpdate?: (stats: EngineStats) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const BlazeGraphicsEngineComponent: React.FC<BlazeGraphicsEngineProps> = ({
  width = 800,
  height = 600,
  enablePhysics = true,
  enableAudio = true,
  performanceMode = 'balanced',
  onEngineReady,
  onStatsUpdate,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BlazeGraphicsEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);
  
  // Animation frame reference for stats updates
  const statsUpdateRef = useRef<number>();

  const initializeEngine = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const config: EngineConfig = {
        canvas: canvasRef.current,
        width,
        height,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        enableRayTracing: true,
        enablePhysics,
        enableAudio,
        maxParticles: performanceMode === 'quality' ? 100000 : performanceMode === 'balanced' ? 50000 : 25000,
        shadowQuality: performanceMode === 'quality' ? 'ultra' : performanceMode === 'balanced' ? 'high' : 'medium',
        postProcessing: true,
        antiAliasing: 'taa',
        debugMode: process.env.NODE_ENV === 'development'
      };

      const engine = new BlazeGraphicsEngine(config);
      await engine.start();
      
      engineRef.current = engine;
      
      // Create demo scene
      await createDemoScene(engine);
      
      // Start stats updates
      startStatsUpdates();
      
      setIsLoading(false);
      onEngineReady?.(engine);
      
    } catch (err) {
      console.error('Failed to initialize Blaze Graphics Engine:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsLoading(false);
    }
  }, [width, height, enablePhysics, enableAudio, performanceMode, onEngineReady]);

  const createDemoScene = async (engine: BlazeGraphicsEngine) => {
    const materialSystem = engine.getMaterialSystem();
    const particleSystem = engine.getParticleSystem();
    
    // Create a rotating cube with PBR material
    const metalMaterial = materialSystem.createPBRMaterial({
      name: 'demo_metal',
      albedo: [0.8, 0.6, 0.4],
      metallic: 1.0,
      roughness: 0.2
    });
    
    const cubeTransform = new Transform();
    cubeTransform.setPosition([0, 0, 0]);
    
    const cubeMesh = engine.getRenderer().getCubeMesh();
    const cubeObject = new GameObject('demo_cube', cubeMesh, metalMaterial, cubeTransform);
    
    // Add rotation animation
    cubeObject.addUpdateCallback((deltaTime: number) => {
      cubeTransform.rotateY(deltaTime * 0.5);
      cubeTransform.rotateX(deltaTime * 0.3);
    });
    
    engine.addGameObject(cubeObject);
    
    // Create ground plane
    const groundMaterial = materialSystem.createPBRMaterial({
      name: 'ground',
      albedo: [0.3, 0.3, 0.3],
      metallic: 0.0,
      roughness: 0.8
    });
    
    const groundTransform = new Transform();
    groundTransform.setPosition([0, -2, 0]);
    groundTransform.setScale([10, 1, 10]);
    
    const groundMesh = engine.getRenderer().getPlaneMesh();
    const groundObject = new GameObject('ground', groundMesh, groundMaterial, groundTransform);
    
    engine.addGameObject(groundObject);
    
    // Add some particles
    if (particleSystem) {
      particleSystem.createEmitter({
        name: 'demo_particles',
        position: [2, 1, 0],
        particleCount: 1000,
        emissionRate: 50,
        velocity: [0, 2, 0],
        velocityVariation: [1, 1, 1],
        size: 0.1,
        sizeVariation: 0.05,
        color: [1, 0.8, 0.2, 1],
        colorVariation: [0.2, 0.2, 0.2, 0],
        lifetime: 3.0,
        lifetimeVariation: 1.0
      });
    }
    
    // Position camera
    const camera = engine.getCamera();
    camera.setPosition([0, 2, 5]);
    camera.lookAt([0, 0, 0]);
  };

  const startStatsUpdates = () => {
    const updateStats = () => {
      if (engineRef.current) {
        const currentStats = engineRef.current.getStats();
        setStats(currentStats);
        onStatsUpdate?.(currentStats);
      }
      statsUpdateRef.current = requestAnimationFrame(updateStats);
    };
    
    updateStats();
  };

  const stopStatsUpdates = () => {
    if (statsUpdateRef.current) {
      cancelAnimationFrame(statsUpdateRef.current);
      statsUpdateRef.current = undefined;
    }
  };

  // Initialize engine on mount
  useEffect(() => {
    initializeEngine();
    
    return () => {
      stopStatsUpdates();
      if (engineRef.current) {
        engineRef.current.shutdown();
        engineRef.current = null;
      }
    };
  }, [initializeEngine]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        // Resize will be handled by the engine's internal resize handler
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Public methods for external control
  const getEngine = () => engineRef.current;
  
  const createGameObject = (name: string, meshType: 'cube' | 'sphere' | 'plane', materialConfig?: any) => {
    if (!engineRef.current) return null;
    
    const renderer = engineRef.current.getRenderer();
    const materialSystem = engineRef.current.getMaterialSystem();
    
    let mesh;
    switch (meshType) {
      case 'cube':
        mesh = renderer.getCubeMesh();
        break;
      case 'sphere':
        mesh = renderer.getSphereMesh();
        break;
      case 'plane':
        mesh = renderer.getPlaneMesh();
        break;
      default:
        mesh = renderer.getCubeMesh();
    }
    
    const material = materialConfig 
      ? materialSystem.createPBRMaterial({ name: `${name}_material`, ...materialConfig })
      : materialSystem.getMaterial('basic_metal');
    
    const transform = new Transform();
    const gameObject = new GameObject(name, mesh, material, transform);
    
    engineRef.current.addGameObject(gameObject);
    return gameObject;
  };

  // Expose methods via ref
  React.useImperativeHandle(canvasRef, () => ({
    getEngine,
    createGameObject,
    getStats: () => stats
  }));

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: width,
    height: height,
    backgroundColor: '#000',
    overflow: 'hidden',
    ...style
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    fontSize: '14px',
    fontFamily: 'monospace'
  };

  return (
    <div className={className} style={containerStyle}>
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        width={width}
        height={height}
      />
      
      {isLoading && (
        <div style={overlayStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '10px' }}>🔥</div>
            <div>Initializing Blaze Graphics Engine...</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
              Loading shaders, materials, and systems
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div style={overlayStyle}>
          <div style={{ textAlign: 'center', color: '#ff6b6b' }}>
            <div style={{ marginBottom: '10px' }}>❌</div>
            <div>Engine Initialization Failed</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              {error}
            </div>
          </div>
        </div>
      )}
      
      {process.env.NODE_ENV === 'development' && stats && !isLoading && !error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          borderRadius: '4px',
          minWidth: '200px'
        }}>
          <div>🔥 Blaze Graphics Engine</div>
          <div>FPS: {stats.fps.toFixed(1)}</div>
          <div>Frame: {stats.frameTime.toFixed(2)}ms</div>
          <div>Draw Calls: {stats.drawCalls}</div>
          <div>Triangles: {stats.triangles.toLocaleString()}</div>
          <div>Objects: {stats.activeGameObjects}</div>
          <div>Lights: {stats.activelights}</div>
          <div>Particles: {stats.activeParticles.toLocaleString()}</div>
          <div>Memory: {(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
        </div>
      )}
    </div>
  );
};

// Hook for using the graphics engine in other components
export const useBlazeGraphicsEngine = () => {
  const [engine, setEngine] = useState<BlazeGraphicsEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<EngineStats | null>(null);

  const handleEngineReady = useCallback((engine: BlazeGraphicsEngine) => {
    setEngine(engine);
    setIsReady(true);
  }, []);

  const handleStatsUpdate = useCallback((stats: EngineStats) => {
    setStats(stats);
  }, []);

  return {
    engine,
    isReady,
    stats,
    handleEngineReady,
    handleStatsUpdate
  };
};

export default BlazeGraphicsEngineComponent;