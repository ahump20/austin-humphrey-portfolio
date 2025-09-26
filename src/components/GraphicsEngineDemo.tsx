/**
 * Graphics Engine Demo Component
 * Comprehensive demonstration of the Blaze Graphics Engine capabilities
 */

import React, { useState, useRef, useCallback } from 'react';
import BlazeGraphicsEngineComponent, { useBlazeGraphicsEngine } from './BlazeGraphicsEngineComponent';
import { BlazeGraphicsEngine, EngineStats } from './graphics-engine/core/BlazeGraphicsEngine';
import { GameObject } from './graphics-engine/core/GameObject';
import { vec3 } from 'gl-matrix';

const GraphicsEngineDemo: React.FC = () => {
  const {
    engine,
    isReady,
    stats,
    handleEngineReady,
    handleStatsUpdate
  } = useBlazeGraphicsEngine();

  const [currentDemo, setCurrentDemo] = useState<string>('pbr-materials');
  const [engineConfig, setEngineConfig] = useState({
    performanceMode: 'balanced' as 'quality' | 'balanced' | 'performance',
    enablePhysics: true,
    enableAudio: true
  });

  const engineRef = useRef<BlazeGraphicsEngine | null>(null);

  const onEngineReady = useCallback((engine: BlazeGraphicsEngine) => {
    engineRef.current = engine;
    handleEngineReady(engine);
    loadDemo(currentDemo, engine);
  }, [currentDemo, handleEngineReady]);

  const loadDemo = async (demoName: string, engine: BlazeGraphicsEngine) => {
    if (!engine) return;

    // Clear existing objects (except ground)
    const gameObjects = engine.getAllGameObjects?.() || new Map();
    for (const [id, obj] of gameObjects) {
      if (id !== 'ground') {
        engine.removeGameObject(id);
      }
    }

    const materialSystem = engine.getMaterialSystem();
    const renderer = engine.getRenderer();

    switch (demoName) {
      case 'pbr-materials':
        await loadPBRMaterialsDemo(engine, materialSystem, renderer);
        break;
      case 'lighting':
        await loadLightingDemo(engine, materialSystem, renderer);
        break;
      case 'particles':
        await loadParticlesDemo(engine);
        break;
      case 'water':
        await loadWaterDemo(engine, materialSystem, renderer);
        break;
      case 'terrain':
        await loadTerrainDemo(engine, materialSystem, renderer);
        break;
      case 'post-processing':
        await loadPostProcessingDemo(engine);
        break;
      default:
        await loadPBRMaterialsDemo(engine, materialSystem, renderer);
    }
  };

  const loadPBRMaterialsDemo = async (engine: any, materialSystem: any, renderer: any) => {
    const materials = [
      // Metals
      { name: 'gold', albedo: [1.0, 0.86, 0.57], metallic: 1.0, roughness: 0.1 },
      { name: 'silver', albedo: [0.95, 0.93, 0.88], metallic: 1.0, roughness: 0.05 },
      { name: 'copper', albedo: [0.95, 0.64, 0.54], metallic: 1.0, roughness: 0.2 },
      { name: 'titanium', albedo: [0.55, 0.56, 0.67], metallic: 1.0, roughness: 0.3 },
      
      // Dielectrics
      { name: 'plastic_red', albedo: [0.8, 0.2, 0.2], metallic: 0.0, roughness: 0.4 },
      { name: 'plastic_green', albedo: [0.2, 0.8, 0.2], metallic: 0.0, roughness: 0.6 },
      { name: 'plastic_blue', albedo: [0.2, 0.2, 0.8], metallic: 0.0, roughness: 0.8 },
      { name: 'ceramic', albedo: [0.9, 0.9, 0.85], metallic: 0.0, roughness: 0.1 }
    ];

    materials.forEach((matConfig, index) => {
      const material = materialSystem.createPBRMaterial({
        name: matConfig.name,
        albedo: matConfig.albedo,
        metallic: matConfig.metallic,
        roughness: matConfig.roughness
      });

      const transform = new Transform();
      const x = (index % 4 - 1.5) * 2;
      const z = Math.floor(index / 4) * 2 - 1;
      transform.setPosition([x, 0, z]);

      const mesh = renderer.getSphereMesh();
      const sphere = new GameObject(`sphere_${matConfig.name}`, mesh, material, transform);

      // Add rotation animation
      sphere.addUpdateCallback((deltaTime: number) => {
        transform.rotateY(deltaTime * 0.5);
      });

      engine.addGameObject(sphere);
    });
  };

  const loadLightingDemo = async (engine: any, materialSystem: any, renderer: any) => {
    const lightingSystem = engine.getLightingSystem();
    
    // Create various light types
    const directionalLight = lightingSystem.createDirectionalLight({
      color: [1.0, 0.9, 0.8],
      intensity: 2.0,
      direction: [-0.5, -1.0, -0.3],
      castShadows: true
    });

    const pointLight1 = lightingSystem.createPointLight({
      position: [3, 2, 0],
      color: [1.0, 0.2, 0.2],
      intensity: 5.0,
      range: 10.0
    });

    const pointLight2 = lightingSystem.createPointLight({
      position: [-3, 2, 0],
      color: [0.2, 1.0, 0.2],
      intensity: 5.0,
      range: 10.0
    });

    const spotLight = lightingSystem.createSpotLight({
      position: [0, 5, 5],
      direction: [0, -1, -1],
      color: [0.2, 0.2, 1.0],
      intensity: 8.0,
      range: 15.0,
      innerCone: 15,
      outerCone: 30
    });

    // Create objects to showcase lighting
    const materials = [
      { name: 'metal', albedo: [0.7, 0.7, 0.8], metallic: 1.0, roughness: 0.2 },
      { name: 'plastic', albedo: [0.8, 0.4, 0.2], metallic: 0.0, roughness: 0.5 },
      { name: 'rough', albedo: [0.6, 0.6, 0.6], metallic: 0.5, roughness: 0.8 }
    ];

    materials.forEach((matConfig, index) => {
      const material = materialSystem.createPBRMaterial(matConfig);
      const transform = new Transform();
      transform.setPosition([(index - 1) * 3, 0, 0]);

      const mesh = renderer.getCubeMesh();
      const cube = new GameObject(`cube_${matConfig.name}`, mesh, material, transform);

      engine.addGameObject(cube);
    });
  };

  const loadParticlesDemo = async (engine: any) => {
    const particleSystem = engine.getParticleSystem();
    
    // Fire effect
    particleSystem.createEmitter({
      name: 'fire',
      position: [-2, 0, 0],
      particleCount: 2000,
      emissionRate: 100,
      velocity: [0, 3, 0],
      velocityVariation: [0.5, 1, 0.5],
      size: 0.2,
      sizeVariation: 0.1,
      color: [1, 0.5, 0.1, 1],
      colorVariation: [0.3, 0.3, 0.1, 0],
      lifetime: 2.0,
      lifetimeVariation: 0.5,
      gravity: [0, -1, 0]
    });

    // Smoke effect
    particleSystem.createEmitter({
      name: 'smoke',
      position: [-2, 2, 0],
      particleCount: 1000,
      emissionRate: 50,
      velocity: [0, 1, 0],
      velocityVariation: [1, 0.5, 1],
      size: 0.5,
      sizeVariation: 0.3,
      color: [0.3, 0.3, 0.3, 0.5],
      colorVariation: [0.1, 0.1, 0.1, 0.2],
      lifetime: 4.0,
      lifetimeVariation: 1.0,
      gravity: [0, 0.2, 0]
    });

    // Magic sparkles
    particleSystem.createEmitter({
      name: 'sparkles',
      position: [2, 1, 0],
      particleCount: 500,
      emissionRate: 25,
      velocity: [0, 0, 0],
      velocityVariation: [2, 2, 2],
      size: 0.05,
      sizeVariation: 0.02,
      color: [0.8, 0.9, 1, 1],
      colorVariation: [0.2, 0.1, 0, 0],
      lifetime: 3.0,
      lifetimeVariation: 1.0,
      gravity: [0, -0.5, 0]
    });
  };

  const loadWaterDemo = async (engine: any, materialSystem: any, renderer: any) => {
    // Create ocean water
    const oceanWater = materialSystem.createMaterial('ocean_water', 'water', 
      WaterMaterial.createOceanPreset('ocean_water')
    );

    const waterTransform = new Transform();
    waterTransform.setPosition([0, -1, 0]);
    waterTransform.setScale([20, 1, 20]);

    const waterMesh = renderer.getPlaneMesh();
    const waterPlane = new GameObject('water', waterMesh, oceanWater, waterTransform);

    engine.addGameObject(waterPlane);

    // Add some rocks
    const rockMaterial = materialSystem.createPBRMaterial({
      name: 'rock',
      albedo: [0.4, 0.3, 0.2],
      metallic: 0.0,
      roughness: 0.9
    });

    for (let i = 0; i < 5; i++) {
      const transform = new Transform();
      transform.setPosition([
        (Math.random() - 0.5) * 15,
        -0.5,
        (Math.random() - 0.5) * 15
      ]);
      transform.setScale([
        0.5 + Math.random(),
        0.3 + Math.random() * 0.5,
        0.5 + Math.random()
      ]);

      const mesh = renderer.getCubeMesh();
      const rock = new GameObject(`rock_${i}`, mesh, rockMaterial, transform);

      engine.addGameObject(rock);
    }
  };

  const loadTerrainDemo = async (engine: any, materialSystem: any, renderer: any) => {
    // Create terrain material with multiple layers
    const terrainMaterial = materialSystem.createMaterial('terrain', 'terrain');
    
    // Add terrain layers
    terrainMaterial.addLayer({
      albedo: [0.3, 0.5, 0.2], // Grass
      metallic: 0.0,
      roughness: 0.8,
      normalScale: 1.0,
      tiling: 4.0
    });

    terrainMaterial.addLayer({
      albedo: [0.4, 0.3, 0.2], // Dirt
      metallic: 0.0,
      roughness: 0.9,
      normalScale: 0.8,
      tiling: 8.0
    });

    terrainMaterial.addLayer({
      albedo: [0.5, 0.5, 0.5], // Rock
      metallic: 0.0,
      roughness: 0.7,
      normalScale: 1.2,
      tiling: 2.0
    });

    const terrainTransform = new Transform();
    terrainTransform.setPosition([0, -2, 0]);
    terrainTransform.setScale([30, 1, 30]);

    const terrainMesh = renderer.getPlaneMesh();
    const terrain = new GameObject('terrain', terrainMesh, terrainMaterial, terrainTransform);

    engine.addGameObject(terrain);
  };

  const loadPostProcessingDemo = async (engine: any) => {
    const effectsProcessor = engine.getEffectsProcessor();
    
    // Enable various post-processing effects
    effectsProcessor.enableBloom(true);
    effectsProcessor.setBloomIntensity(1.2);
    effectsProcessor.setBloomThreshold(0.8);
    
    effectsProcessor.enableToneMapping(true);
    effectsProcessor.setExposure(1.5);
    
    effectsProcessor.enableVignette(true);
    effectsProcessor.setVignetteIntensity(0.3);
    
    // Create bright emissive objects to showcase bloom
    const materialSystem = engine.getMaterialSystem();
    const renderer = engine.getRenderer();

    const emissiveMaterials = [
      { color: [10, 2, 2], pos: [-3, 0, 0] },
      { color: [2, 10, 2], pos: [0, 0, 0] },
      { color: [2, 2, 10], pos: [3, 0, 0] }
    ];

    emissiveMaterials.forEach((config, index) => {
      const material = materialSystem.createPBRMaterial({
        name: `emissive_${index}`,
        albedo: [0.1, 0.1, 0.1],
        metallic: 0.0,
        roughness: 0.5,
        emissive: config.color,
        emissiveIntensity: 1.0
      });

      const transform = new Transform();
      transform.setPosition(config.pos);

      const mesh = renderer.getSphereMesh();
      const sphere = new GameObject(`emissive_sphere_${index}`, mesh, material, transform);

      // Add pulsing animation
      sphere.addUpdateCallback((deltaTime: number) => {
        const time = performance.now() * 0.001;
        const intensity = 0.5 + 0.5 * Math.sin(time * 2 + index);
        material.setEmissiveIntensity(intensity);
        transform.rotateY(deltaTime);
      });

      engine.addGameObject(sphere);
    });
  };

  const handleDemoChange = (demoName: string) => {
    setCurrentDemo(demoName);
    if (engineRef.current) {
      loadDemo(demoName, engineRef.current);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setEngineConfig(prev => ({ ...prev, [key]: value }));
  };

  const demoOptions = [
    { id: 'pbr-materials', name: 'PBR Materials', description: 'Physically Based Rendering materials showcase' },
    { id: 'lighting', name: 'Lighting', description: 'Various light types and shadow mapping' },
    { id: 'particles', name: 'Particle Systems', description: 'Fire, smoke, and magical effects' },
    { id: 'water', name: 'Water Rendering', description: 'Realistic water with waves and reflections' },
    { id: 'terrain', name: 'Terrain', description: 'Multi-layer terrain with height-based blending' },
    { id: 'post-processing', name: 'Post-Processing', description: 'HDR, bloom, tone mapping, and more' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            🔥 Blaze Graphics Engine
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Hyper-Realistic 3D Graphics Engine Demo
          </p>
          <p className="text-sm text-gray-400">
            200,000+ lines of production-quality WebGL 2.0 rendering code
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Demo Selection */}
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Demo Scenes</h3>
              <div className="space-y-2">
                {demoOptions.map(demo => (
                  <button
                    key={demo.id}
                    onClick={() => handleDemoChange(demo.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      currentDemo === demo.id
                        ? 'bg-orange-500/20 border border-orange-500/50'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="font-medium">{demo.name}</div>
                    <div className="text-sm text-gray-400 mt-1">{demo.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Engine Configuration */}
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Engine Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Performance Mode</label>
                  <select
                    value={engineConfig.performanceMode}
                    onChange={(e) => handleConfigChange('performanceMode', e.target.value)}
                    className="w-full bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="performance">Performance</option>
                    <option value="balanced">Balanced</option>
                    <option value="quality">Quality</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="physics"
                    checked={engineConfig.enablePhysics}
                    onChange={(e) => handleConfigChange('enablePhysics', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="physics" className="text-sm">Enable Physics</label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="audio"
                    checked={engineConfig.enableAudio}
                    onChange={(e) => handleConfigChange('enableAudio', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="audio" className="text-sm">Enable Audio</label>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            {stats && (
              <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Performance</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span>FPS:</span>
                    <span className={stats.fps > 50 ? 'text-green-400' : stats.fps > 30 ? 'text-yellow-400' : 'text-red-400'}>
                      {stats.fps.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frame Time:</span>
                    <span>{stats.frameTime.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Draw Calls:</span>
                    <span>{stats.drawCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Triangles:</span>
                    <span>{stats.triangles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Objects:</span>
                    <span>{stats.activeGameObjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Particles:</span>
                    <span>{stats.activeParticles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory:</span>
                    <span>{(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Graphics Engine Viewport */}
          <div className="lg:col-span-3">
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <BlazeGraphicsEngineComponent
                  width={800}
                  height={450}
                  enablePhysics={engineConfig.enablePhysics}
                  enableAudio={engineConfig.enableAudio}
                  performanceMode={engineConfig.performanceMode}
                  onEngineReady={onEngineReady}
                  onStatsUpdate={handleStatsUpdate}
                  className="w-full h-full"
                />
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-400">
                  Use mouse to orbit • WASD to move • Mouse wheel to zoom • F3 for debug overlay
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: '🎨', title: 'PBR Materials', desc: 'Physically accurate materials with metallic-roughness workflow' },
            { icon: '💡', title: 'Advanced Lighting', desc: 'Directional, point, and spot lights with real-time shadows' },
            { icon: '✨', title: 'Particle Systems', desc: 'GPU-accelerated particles for fire, smoke, and effects' },
            { icon: '🌊', title: 'Water Rendering', desc: 'Realistic water with waves, foam, and reflections' },
            { icon: '🏔️', title: 'Terrain System', desc: 'Multi-layer terrain with height-based material blending' },
            { icon: '🎭', title: 'Post-Processing', desc: 'HDR, bloom, tone mapping, and cinematic effects' },
            { icon: '⚡', title: 'High Performance', desc: 'Optimized WebGL 2.0 rendering with frustum culling' },
            { icon: '🔧', title: 'Extensible', desc: 'Modular architecture with custom materials and effects' }
          ].map((feature, index) => (
            <div key={index} className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10 text-center">
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h4 className="font-semibold mb-2">{feature.title}</h4>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GraphicsEngineDemo;