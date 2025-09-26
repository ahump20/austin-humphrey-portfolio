/**
 * BLAZE GRAPHICS ENGINE v2.0
 * Advanced Hyper-Realistic 3D Graphics Engine
 * Built for maximum performance and visual fidelity
 * 
 * Core Features:
 * - WebGL 2.0 renderer with advanced shaders
 * - Physically Based Rendering (PBR)
 * - Real-time ray tracing simulation
 * - Advanced particle systems
 * - Dynamic lighting and shadows
 * - Post-processing pipeline
 * - Physics simulation
 * - Audio spatial processing
 * - AI-driven procedural generation
 * 
 * @author Austin Humphrey
 * @version 2.0.0
 * @license MIT
 */

import { WebGLRenderer } from './WebGLRenderer';
import { RenderingPipeline } from '../rendering/RenderingPipeline';
import { ShaderManager } from '../shaders/ShaderManager';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { AudioEngine } from '../audio/AudioEngine';
import { LightingSystem } from '../lighting/LightingSystem';
import { MaterialSystem } from '../materials/MaterialSystem';
import { ParticleSystem } from '../particles/ParticleSystem';
import { TerrainEngine } from '../terrain/TerrainEngine';
import { EffectsProcessor } from '../effects/EffectsProcessor';
import { AIManager } from '../ai/AIManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { InputManager } from '../utils/InputManager';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneGraph } from './SceneGraph';
import { Camera } from './Camera';
import { Transform } from './Transform';
import { GameObject } from './GameObject';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio: number;
  enableRayTracing: boolean;
  enablePhysics: boolean;
  enableAudio: boolean;
  maxParticles: number;
  shadowQuality: 'low' | 'medium' | 'high' | 'ultra';
  postProcessing: boolean;
  antiAliasing: 'none' | 'fxaa' | 'msaa' | 'taa';
  debugMode: boolean;
  performanceMode: 'quality' | 'balanced' | 'performance';
}

export interface EngineStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  vertices: number;
  memoryUsage: number;
  gpuTime: number;
  cpuTime: number;
  activeGameObjects: number;
  activelights: number;
  activeParticles: number;
  audioChannels: number;
}

export class BlazeGraphicsEngine {
  private config: EngineConfig;
  private renderer: WebGLRenderer;
  private renderingPipeline: RenderingPipeline;
  private shaderManager: ShaderManager;
  private physicsEngine: PhysicsEngine;
  private audioEngine: AudioEngine;
  private lightingSystem: LightingSystem;
  private materialSystem: MaterialSystem;
  private particleSystem: ParticleSystem;
  private terrainEngine: TerrainEngine;
  private effectsProcessor: EffectsProcessor;
  private aiManager: AIManager;
  private performanceMonitor: PerformanceMonitor;
  private inputManager: InputManager;
  private assetLoader: AssetLoader;
  private sceneGraph: SceneGraph;
  private mainCamera: Camera;
  
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private deltaTime: number = 0;
  private frameCount: number = 0;
  private startTime: number = 0;
  
  private gameObjects: Map<string, GameObject> = new Map();
  private updateCallbacks: Function[] = [];
  private renderCallbacks: Function[] = [];
  
  constructor(config: EngineConfig) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.initializeEngine();
  }

  private getDefaultConfig(): EngineConfig {
    return {
      canvas: document.createElement('canvas'),
      width: 1920,
      height: 1080,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      enableRayTracing: true,
      enablePhysics: true,
      enableAudio: true,
      maxParticles: 100000,
      shadowQuality: 'high',
      postProcessing: true,
      antiAliasing: 'taa',
      debugMode: false,
      performanceMode: 'balanced'
    };
  }

  private async initializeEngine(): Promise<void> {
    console.log('🔥 Initializing Blaze Graphics Engine v2.0...');
    
    try {
      // Initialize core systems
      this.renderer = new WebGLRenderer(this.config);
      await this.renderer.initialize();
      
      this.sceneGraph = new SceneGraph();
      this.mainCamera = new Camera();
      this.mainCamera.setAspectRatio(this.config.width / this.config.height);
      
      // Initialize subsystems
      this.shaderManager = new ShaderManager(this.renderer.getContext());
      await this.shaderManager.initialize();
      
      this.materialSystem = new MaterialSystem(this.shaderManager);
      await this.materialSystem.initialize();
      
      this.lightingSystem = new LightingSystem(this.renderer, this.shaderManager);
      await this.lightingSystem.initialize();
      
      this.renderingPipeline = new RenderingPipeline(
        this.renderer, 
        this.shaderManager, 
        this.lightingSystem,
        this.materialSystem
      );
      await this.renderingPipeline.initialize();
      
      if (this.config.enablePhysics) {
        this.physicsEngine = new PhysicsEngine();
        await this.physicsEngine.initialize();
      }
      
      if (this.config.enableAudio) {
        this.audioEngine = new AudioEngine();
        await this.audioEngine.initialize();
      }
      
      this.particleSystem = new ParticleSystem(this.renderer, this.shaderManager);
      await this.particleSystem.initialize(this.config.maxParticles);
      
      this.terrainEngine = new TerrainEngine(this.renderer, this.shaderManager, this.materialSystem);
      await this.terrainEngine.initialize();
      
      this.effectsProcessor = new EffectsProcessor(this.renderer, this.shaderManager);
      await this.effectsProcessor.initialize();
      
      this.aiManager = new AIManager();
      await this.aiManager.initialize();
      
      this.performanceMonitor = new PerformanceMonitor();
      this.inputManager = new InputManager(this.config.canvas);
      this.assetLoader = new AssetLoader();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize scene
      this.setupDefaultScene();
      
      this.startTime = performance.now();
      
      console.log('✅ Blaze Graphics Engine initialized successfully!');
      
    } catch (error) {
      console.error('❌ Failed to initialize Blaze Graphics Engine:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('beforeunload', this.shutdown.bind(this));
    
    // Performance monitoring
    this.inputManager.onKeyDown('F3', () => {
      this.config.debugMode = !this.config.debugMode;
      console.log(`Debug mode: ${this.config.debugMode ? 'ON' : 'OFF'}`);
    });
    
    this.inputManager.onKeyDown('F11', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        this.config.canvas.requestFullscreen();
      }
    });
  }

  private setupDefaultScene(): void {
    // Create default lighting
    const sunLight = this.lightingSystem.createDirectionalLight({
      color: [1.0, 0.95, 0.8],
      intensity: 3.0,
      direction: [-0.5, -1.0, -0.3],
      castShadows: true,
      shadowMapSize: 4096
    });
    
    const ambientLight = this.lightingSystem.createAmbientLight({
      color: [0.4, 0.6, 1.0],
      intensity: 0.3
    });
    
    // Setup main camera
    this.mainCamera.setPosition([0, 10, 20]);
    this.mainCamera.lookAt([0, 0, 0]);
    this.mainCamera.setFOV(75);
    this.mainCamera.setNearFar(0.1, 1000);
    
    // Create ground plane
    this.createGroundPlane();
    
    // Setup atmospheric effects
    this.effectsProcessor.enableAtmosphericScattering({
      sunPosition: [-0.5, -1.0, -0.3],
      rayleighCoefficient: 0.0025,
      mieCoefficient: 0.0010,
      sunIntensity: 20.0,
      turbidity: 4.0
    });
  }

  private createGroundPlane(): GameObject {
    const groundTransform = new Transform();
    groundTransform.setScale([100, 1, 100]);
    groundTransform.setPosition([0, 0, 0]);
    
    const groundMaterial = this.materialSystem.createPBRMaterial({
      albedo: [0.3, 0.3, 0.3],
      metallic: 0.0,
      roughness: 0.8,
      normal: null,
      ao: null,
      height: null
    });
    
    const groundMesh = this.renderer.createPlaneMesh(1, 1, 128, 128);
    
    const groundObject = new GameObject('ground', groundMesh, groundMaterial, groundTransform);
    this.addGameObject(groundObject);
    
    return groundObject;
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    
    console.log('🚀 Starting Blaze Graphics Engine...');
    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;
    console.log('⏸️ Blaze Graphics Engine stopped');
  }

  private gameLoop(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastFrameTime) / 1000.0;
    this.lastFrameTime = currentTime;
    this.frameCount++;
    
    // Update performance monitor
    this.performanceMonitor.beginFrame();
    
    // Update phase
    this.update(this.deltaTime);
    
    // Render phase
    this.render();
    
    // End frame monitoring
    this.performanceMonitor.endFrame();
    
    // Schedule next frame
    requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    // Update input
    this.inputManager.update();
    
    // Update physics
    if (this.physicsEngine && this.config.enablePhysics) {
      this.physicsEngine.update(deltaTime);
    }
    
    // Update AI
    this.aiManager.update(deltaTime);
    
    // Update particles
    this.particleSystem.update(deltaTime);
    
    // Update audio
    if (this.audioEngine && this.config.enableAudio) {
      this.audioEngine.update(deltaTime, this.mainCamera.getPosition(), this.mainCamera.getForward());
    }
    
    // Update game objects
    for (const gameObject of this.gameObjects.values()) {
      gameObject.update(deltaTime);
    }
    
    // Update terrain LOD
    this.terrainEngine.update(this.mainCamera.getPosition());
    
    // Update lighting
    this.lightingSystem.update(deltaTime);
    
    // Custom update callbacks
    for (const callback of this.updateCallbacks) {
      callback(deltaTime);
    }
  }

  private render(): void {
    // Begin rendering pipeline
    this.renderingPipeline.beginFrame();
    
    // Setup camera matrices
    const viewMatrix = this.mainCamera.getViewMatrix();
    const projectionMatrix = this.mainCamera.getProjectionMatrix();
    
    this.renderingPipeline.setCamera(viewMatrix, projectionMatrix, this.mainCamera.getPosition());
    
    // Render scene
    this.renderingPipeline.renderScene(this.sceneGraph, this.gameObjects);
    
    // Render terrain
    this.terrainEngine.render(this.renderingPipeline);
    
    // Render particles
    this.particleSystem.render(this.renderingPipeline);
    
    // Apply post-processing effects
    if (this.config.postProcessing) {
      this.effectsProcessor.process(this.renderingPipeline.getFinalTexture());
    }
    
    // Custom render callbacks
    for (const callback of this.renderCallbacks) {
      callback();
    }
    
    // End rendering pipeline
    this.renderingPipeline.endFrame();
    
    // Debug rendering
    if (this.config.debugMode) {
      this.renderDebugInfo();
    }
  }

  private renderDebugInfo(): void {
    const stats = this.getStats();
    const ctx = this.config.canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 300, 200);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      
      let y = 30;
      const lineHeight = 16;
      
      ctx.fillText(`FPS: ${stats.fps.toFixed(1)}`, 20, y); y += lineHeight;
      ctx.fillText(`Frame Time: ${stats.frameTime.toFixed(2)}ms`, 20, y); y += lineHeight;
      ctx.fillText(`Draw Calls: ${stats.drawCalls}`, 20, y); y += lineHeight;
      ctx.fillText(`Triangles: ${stats.triangles.toLocaleString()}`, 20, y); y += lineHeight;
      ctx.fillText(`Vertices: ${stats.vertices.toLocaleString()}`, 20, y); y += lineHeight;
      ctx.fillText(`Memory: ${(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB`, 20, y); y += lineHeight;
      ctx.fillText(`GameObjects: ${stats.activeGameObjects}`, 20, y); y += lineHeight;
      ctx.fillText(`Lights: ${stats.activelights}`, 20, y); y += lineHeight;
      ctx.fillText(`Particles: ${stats.activeParticles.toLocaleString()}`, 20, y); y += lineHeight;
      ctx.fillText(`Audio Channels: ${stats.audioChannels}`, 20, y); y += lineHeight;
    }
  }

  private handleResize(): void {
    const canvas = this.config.canvas;
    const rect = canvas.getBoundingClientRect();
    
    this.config.width = rect.width * this.config.pixelRatio;
    this.config.height = rect.height * this.config.pixelRatio;
    
    canvas.width = this.config.width;
    canvas.height = this.config.height;
    
    this.renderer.resize(this.config.width, this.config.height);
    this.renderingPipeline.resize(this.config.width, this.config.height);
    this.mainCamera.setAspectRatio(this.config.width / this.config.height);
    
    console.log(`🔄 Engine resized to ${this.config.width}x${this.config.height}`);
  }

  // Public API methods
  public addGameObject(gameObject: GameObject): void {
    this.gameObjects.set(gameObject.getId(), gameObject);
    this.sceneGraph.addNode(gameObject);
  }

  public removeGameObject(id: string): void {
    const gameObject = this.gameObjects.get(id);
    if (gameObject) {
      this.sceneGraph.removeNode(gameObject);
      this.gameObjects.delete(id);
    }
  }

  public getGameObject(id: string): GameObject | undefined {
    return this.gameObjects.get(id);
  }

  public getCamera(): Camera {
    return this.mainCamera;
  }

  public getRenderer(): WebGLRenderer {
    return this.renderer;
  }

  public getShaderManager(): ShaderManager {
    return this.shaderManager;
  }

  public getMaterialSystem(): MaterialSystem {
    return this.materialSystem;
  }

  public getLightingSystem(): LightingSystem {
    return this.lightingSystem;
  }

  public getParticleSystem(): ParticleSystem {
    return this.particleSystem;
  }

  public getPhysicsEngine(): PhysicsEngine {
    return this.physicsEngine;
  }

  public getAudioEngine(): AudioEngine {
    return this.audioEngine;
  }

  public getTerrainEngine(): TerrainEngine {
    return this.terrainEngine;
  }

  public getEffectsProcessor(): EffectsProcessor {
    return this.effectsProcessor;
  }

  public getAIManager(): AIManager {
    return this.aiManager;
  }

  public getInputManager(): InputManager {
    return this.inputManager;
  }

  public getAssetLoader(): AssetLoader {
    return this.assetLoader;
  }

  public addUpdateCallback(callback: Function): void {
    this.updateCallbacks.push(callback);
  }

  public addRenderCallback(callback: Function): void {
    this.renderCallbacks.push(callback);
  }

  public removeUpdateCallback(callback: Function): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index !== -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  public removeRenderCallback(callback: Function): void {
    const index = this.renderCallbacks.indexOf(callback);
    if (index !== -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  public getStats(): EngineStats {
    const currentTime = performance.now();
    const runTime = currentTime - this.startTime;
    const fps = this.frameCount / (runTime / 1000);
    
    return {
      fps: fps,
      frameTime: this.deltaTime * 1000,
      drawCalls: this.renderer.getDrawCalls(),
      triangles: this.renderer.getTriangleCount(),
      vertices: this.renderer.getVertexCount(),
      memoryUsage: this.renderer.getMemoryUsage(),
      gpuTime: this.performanceMonitor.getGPUTime(),
      cpuTime: this.performanceMonitor.getCPUTime(),
      activeGameObjects: this.gameObjects.size,
      activelights: this.lightingSystem.getActiveLightCount(),
      activeParticles: this.particleSystem.getActiveParticleCount(),
      audioChannels: this.audioEngine ? this.audioEngine.getActiveChannelCount() : 0
    };
  }

  public setPerformanceMode(mode: 'quality' | 'balanced' | 'performance'): void {
    this.config.performanceMode = mode;
    
    switch (mode) {
      case 'quality':
        this.config.shadowQuality = 'ultra';
        this.config.antiAliasing = 'taa';
        this.config.maxParticles = 100000;
        break;
      case 'balanced':
        this.config.shadowQuality = 'high';
        this.config.antiAliasing = 'fxaa';
        this.config.maxParticles = 50000;
        break;
      case 'performance':
        this.config.shadowQuality = 'low';
        this.config.antiAliasing = 'none';
        this.config.maxParticles = 10000;
        break;
    }
    
    this.applyPerformanceSettings();
  }

  private applyPerformanceSettings(): void {
    this.lightingSystem.setShadowQuality(this.config.shadowQuality);
    this.renderingPipeline.setAntiAliasing(this.config.antiAliasing);
    this.particleSystem.setMaxParticles(this.config.maxParticles);
    
    console.log(`🎮 Performance mode set to: ${this.config.performanceMode}`);
  }

  public shutdown(): void {
    console.log('🔥 Shutting down Blaze Graphics Engine...');
    
    this.stop();
    
    // Cleanup resources
    this.renderer.cleanup();
    this.renderingPipeline.cleanup();
    this.shaderManager.cleanup();
    
    if (this.physicsEngine) {
      this.physicsEngine.cleanup();
    }
    
    if (this.audioEngine) {
      this.audioEngine.cleanup();
    }
    
    this.particleSystem.cleanup();
    this.terrainEngine.cleanup();
    this.effectsProcessor.cleanup();
    this.lightingSystem.cleanup();
    this.materialSystem.cleanup();
    this.aiManager.cleanup();
    
    // Clear collections
    this.gameObjects.clear();
    this.updateCallbacks.length = 0;
    this.renderCallbacks.length = 0;
    
    console.log('✅ Blaze Graphics Engine shutdown complete');
  }
}