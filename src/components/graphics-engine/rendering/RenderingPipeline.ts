/**
 * Advanced Rendering Pipeline
 * Multi-pass rendering with deferred shading, post-processing, and HDR
 */

import { WebGLRenderer } from '../core/WebGLRenderer';
import { ShaderManager } from '../shaders/ShaderManager';
import { LightingSystem } from '../lighting/LightingSystem';
import { MaterialSystem } from '../materials/MaterialSystem';
import { FrameBuffer } from '../core/FrameBuffer';
import { Texture } from '../core/Texture';
import { SceneGraph, SceneNode } from '../core/SceneGraph';
import { GameObject } from '../core/GameObject';
import { mat4, vec3 } from 'gl-matrix';

export interface RenderPassConfig {
  name: string;
  enabled: boolean;
  priority: number;
  clearColor: [number, number, number, number];
  clearDepth: number;
  renderTarget?: FrameBuffer;
}

export interface RenderStats {
  totalDrawCalls: number;
  shadowDrawCalls: number;
  opaqueDrawCalls: number;
  transparentDrawCalls: number;
  postProcessPasses: number;
  trianglesRendered: number;
  pixelsShaded: number;
  frameTime: number;
}

export class RenderingPipeline {
  private renderer: WebGLRenderer;
  private shaderManager: ShaderManager;
  private lightingSystem: LightingSystem;
  private materialSystem: MaterialSystem;
  private gl: WebGL2RenderingContext;
  
  // Render targets
  private gBuffer: FrameBuffer;
  private shadowMapBuffer: FrameBuffer;
  private lightingBuffer: FrameBuffer;
  private postProcessBuffer1: FrameBuffer;
  private postProcessBuffer2: FrameBuffer;
  private finalBuffer: FrameBuffer;
  
  // HDR and tone mapping
  private hdrBuffer: FrameBuffer;
  private bloomBuffer: FrameBuffer;
  private exposureTexture: Texture;
  
  // Camera matrices
  private viewMatrix: mat4 = mat4.create();
  private projectionMatrix: mat4 = mat4.create();
  private viewProjectionMatrix: mat4 = mat4.create();
  private cameraPosition: vec3 = vec3.create();
  
  // Render passes
  private renderPasses: Map<string, RenderPassConfig> = new Map();
  private activePass: string = '';
  
  // Settings
  private enableDeferred: boolean = true;
  private enableHDR: boolean = true;
  private enableShadows: boolean = true;
  private enableSSAO: boolean = true;
  private enableBloom: boolean = true;
  private enableToneMapping: boolean = true;
  private antiAliasing: 'none' | 'fxaa' | 'msaa' | 'taa' = 'taa';
  
  // Statistics
  private stats: RenderStats = {
    totalDrawCalls: 0,
    shadowDrawCalls: 0,
    opaqueDrawCalls: 0,
    transparentDrawCalls: 0,
    postProcessPasses: 0,
    trianglesRendered: 0,
    pixelsShaded: 0,
    frameTime: 0
  };
  
  private frameStartTime: number = 0;
  
  // Temporal data for TAA
  private previousViewProjectionMatrix: mat4 = mat4.create();
  private temporalIndex: number = 0;
  private haltonSequence: vec3[] = [];

  constructor(
    renderer: WebGLRenderer,
    shaderManager: ShaderManager,
    lightingSystem: LightingSystem,
    materialSystem: MaterialSystem
  ) {
    this.renderer = renderer;
    this.shaderManager = shaderManager;
    this.lightingSystem = lightingSystem;
    this.materialSystem = materialSystem;
    this.gl = renderer.getContext();
  }

  public async initialize(): Promise<void> {
    await this.createRenderTargets();
    await this.setupRenderPasses();
    await this.initializeShaders();
    this.generateHaltonSequence();
    
    console.log('✅ Rendering Pipeline initialized');
  }

  private async createRenderTargets(): Promise<void> {
    const gl = this.gl;
    const width = 1920; // Default size, will be resized
    const height = 1080;
    
    // G-Buffer for deferred rendering
    this.gBuffer = new FrameBuffer(gl, {
      width,
      height,
      colorAttachments: 4, // Albedo+Metallic, Normal+Roughness, Motion+Depth, Emission+AO
      hasDepth: true,
      hasStencil: false,
      colorFormat: gl.RGBA16F,
      depthFormat: gl.DEPTH_COMPONENT24,
      multisampled: false,
      samples: 1
    });
    
    // Shadow map buffer
    this.shadowMapBuffer = new FrameBuffer(gl, {
      width: 4096,
      height: 4096,
      colorAttachments: 0,
      hasDepth: true,
      hasStencil: false,
      colorFormat: gl.RGBA,
      depthFormat: gl.DEPTH_COMPONENT32F,
      multisampled: false,
      samples: 1
    });
    
    // Lighting buffer
    this.lightingBuffer = new FrameBuffer(gl, {
      width,
      height,
      colorAttachments: 2, // HDR Color, Brightness
      hasDepth: false,
      hasStencil: false,
      colorFormat: gl.RGBA16F,
      depthFormat: gl.DEPTH_COMPONENT24,
      multisampled: false,
      samples: 1
    });
    
    // HDR buffer
    this.hdrBuffer = new FrameBuffer(gl, {
      width,
      height,
      colorAttachments: 1,
      hasDepth: false,
      hasStencil: false,
      colorFormat: gl.RGBA16F,
      depthFormat: gl.DEPTH_COMPONENT24,
      multisampled: false,
      samples: 1
    });
    
    // Bloom buffer (quarter resolution)
    this.bloomBuffer = new FrameBuffer(gl, {
      width: width / 4,
      height: height / 4,
      colorAttachments: 1,
      hasDepth: false,
      hasStencil: false,
      colorFormat: gl.RGBA16F,
      depthFormat: gl.DEPTH_COMPONENT24,
      multisampled: false,
      samples: 1
    });
    
    // Post-process buffers
    this.postProcessBuffer1 = new FrameBuffer(gl, {
      width,
      height,
      colorAttachments: 1,
      hasDepth: false,
      hasStencil: false,
      colorFormat: gl.RGBA8,
      depthFormat: gl.DEPTH_COMPONENT24,
      multisampled: false,
      samples: 1
    });
    
    this.postProcessBuffer2 = new FrameBuffer(gl, {
      width,
      height,
      colorAttachments: 1,
      hasDepth: false,
      hasStencil: false,
      colorFormat: gl.RGBA8,
      depthFormat: gl.DEPTH_COMPONENT24,
      multisampled: false,
      samples: 1
    });
    
    // Final output buffer
    this.finalBuffer = new FrameBuffer(gl, {
      width,
      height,
      colorAttachments: 1,
      hasDepth: false,
      hasStencil: false,
      colorFormat: gl.RGBA8,
      depthFormat: gl.DEPTH_COMPONENT24,
      multisampled: false,
      samples: 1
    });
    
    // Exposure texture for auto-exposure
    this.exposureTexture = new Texture(gl, {
      width: 1,
      height: 1,
      format: gl.R32F,
      type: gl.FLOAT,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      generateMipmaps: false,
      data: new Float32Array([1.0])
    });
  }

  private async setupRenderPasses(): Promise<void> {
    // Shadow map pass
    this.renderPasses.set('shadows', {
      name: 'shadows',
      enabled: this.enableShadows,
      priority: 0,
      clearColor: [1, 1, 1, 1],
      clearDepth: 1.0,
      renderTarget: this.shadowMapBuffer
    });
    
    // G-Buffer pass (deferred)
    this.renderPasses.set('gbuffer', {
      name: 'gbuffer',
      enabled: this.enableDeferred,
      priority: 1,
      clearColor: [0, 0, 0, 0],
      clearDepth: 1.0,
      renderTarget: this.gBuffer
    });
    
    // SSAO pass
    this.renderPasses.set('ssao', {
      name: 'ssao',
      enabled: this.enableSSAO,
      priority: 2,
      clearColor: [1, 1, 1, 1],
      clearDepth: 1.0
    });
    
    // Lighting pass
    this.renderPasses.set('lighting', {
      name: 'lighting',
      enabled: true,
      priority: 3,
      clearColor: [0, 0, 0, 0],
      clearDepth: 1.0,
      renderTarget: this.lightingBuffer
    });
    
    // Forward transparent pass
    this.renderPasses.set('transparent', {
      name: 'transparent',
      enabled: true,
      priority: 4,
      clearColor: [0, 0, 0, 0],
      clearDepth: 1.0,
      renderTarget: this.lightingBuffer
    });
    
    // Bloom pass
    this.renderPasses.set('bloom', {
      name: 'bloom',
      enabled: this.enableBloom,
      priority: 5,
      clearColor: [0, 0, 0, 0],
      clearDepth: 1.0,
      renderTarget: this.bloomBuffer
    });
    
    // Tone mapping pass
    this.renderPasses.set('tonemapping', {
      name: 'tonemapping',
      enabled: this.enableToneMapping,
      priority: 6,
      clearColor: [0, 0, 0, 1],
      clearDepth: 1.0,
      renderTarget: this.postProcessBuffer1
    });
    
    // Anti-aliasing pass
    this.renderPasses.set('antialiasing', {
      name: 'antialiasing',
      enabled: this.antiAliasing !== 'none',
      priority: 7,
      clearColor: [0, 0, 0, 1],
      clearDepth: 1.0,
      renderTarget: this.finalBuffer
    });
  }

  private async initializeShaders(): Promise<void> {
    // Load all required shaders
    await Promise.all([
      this.shaderManager.loadShader('gbuffer', '/shaders/gbuffer.vert', '/shaders/gbuffer.frag'),
      this.shaderManager.loadShader('lighting', '/shaders/fullscreen.vert', '/shaders/deferred_lighting.frag'),
      this.shaderManager.loadShader('shadow', '/shaders/shadow.vert', '/shaders/shadow.frag'),
      this.shaderManager.loadShader('ssao', '/shaders/fullscreen.vert', '/shaders/ssao.frag'),
      this.shaderManager.loadShader('bloom_extract', '/shaders/fullscreen.vert', '/shaders/bloom_extract.frag'),
      this.shaderManager.loadShader('bloom_blur', '/shaders/fullscreen.vert', '/shaders/bloom_blur.frag'),
      this.shaderManager.loadShader('bloom_composite', '/shaders/fullscreen.vert', '/shaders/bloom_composite.frag'),
      this.shaderManager.loadShader('tonemap', '/shaders/fullscreen.vert', '/shaders/tonemap.frag'),
      this.shaderManager.loadShader('fxaa', '/shaders/fullscreen.vert', '/shaders/fxaa.frag'),
      this.shaderManager.loadShader('taa', '/shaders/fullscreen.vert', '/shaders/taa.frag'),
      this.shaderManager.loadShader('forward', '/shaders/forward.vert', '/shaders/forward.frag')
    ]);
  }

  private generateHaltonSequence(): void {
    // Generate Halton sequence for TAA jittering
    for (let i = 0; i < 16; i++) {
      const x = this.halton(i, 2) - 0.5;
      const y = this.halton(i, 3) - 0.5;
      this.haltonSequence.push(vec3.fromValues(x, y, 0));
    }
  }

  private halton(index: number, base: number): number {
    let result = 0;
    let fraction = 1 / base;
    let i = index;
    
    while (i > 0) {
      result += (i % base) * fraction;
      i = Math.floor(i / base);
      fraction /= base;
    }
    
    return result;
  }

  public beginFrame(): void {
    this.frameStartTime = performance.now();
    this.resetStats();
    
    // Store previous frame data for TAA
    mat4.copy(this.previousViewProjectionMatrix, this.viewProjectionMatrix);
    this.temporalIndex = (this.temporalIndex + 1) % this.haltonSequence.length;
  }

  public endFrame(): void {
    this.stats.frameTime = performance.now() - this.frameStartTime;
  }

  private resetStats(): void {
    this.stats.totalDrawCalls = 0;
    this.stats.shadowDrawCalls = 0;
    this.stats.opaqueDrawCalls = 0;
    this.stats.transparentDrawCalls = 0;
    this.stats.postProcessPasses = 0;
    this.stats.trianglesRendered = 0;
    this.stats.pixelsShaded = 0;
  }

  public setCamera(viewMatrix: mat4, projectionMatrix: mat4, position: vec3): void {
    mat4.copy(this.viewMatrix, viewMatrix);
    mat4.copy(this.projectionMatrix, projectionMatrix);
    mat4.multiply(this.viewProjectionMatrix, projectionMatrix, viewMatrix);
    vec3.copy(this.cameraPosition, position);
  }

  public renderScene(sceneGraph: SceneGraph, gameObjects: Map<string, GameObject>): void {
    const sortedPasses = Array.from(this.renderPasses.values())
      .filter(pass => pass.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const pass of sortedPasses) {
      this.executeRenderPass(pass, sceneGraph, gameObjects);
    }
  }

  private executeRenderPass(
    pass: RenderPassConfig,
    sceneGraph: SceneGraph,
    gameObjects: Map<string, GameObject>
  ): void {
    this.activePass = pass.name;
    
    // Bind render target
    if (pass.renderTarget) {
      pass.renderTarget.bind();
    } else {
      this.renderer.bindFramebuffer(null);
    }
    
    // Clear render target
    pass.renderTarget?.clear(pass.clearColor, pass.clearDepth);
    
    switch (pass.name) {
      case 'shadows':
        this.renderShadowPass(sceneGraph, gameObjects);
        break;
      case 'gbuffer':
        this.renderGBufferPass(sceneGraph, gameObjects);
        break;
      case 'ssao':
        this.renderSSAOPass();
        break;
      case 'lighting':
        this.renderLightingPass();
        break;
      case 'transparent':
        this.renderTransparentPass(sceneGraph, gameObjects);
        break;
      case 'bloom':
        this.renderBloomPass();
        break;
      case 'tonemapping':
        this.renderToneMappingPass();
        break;
      case 'antialiasing':
        this.renderAntiAliasingPass();
        break;
    }
    
    // Unbind render target
    if (pass.renderTarget) {
      pass.renderTarget.unbind();
    }
  }

  private renderShadowPass(sceneGraph: SceneGraph, gameObjects: Map<string, GameObject>): void {
    const shadowShader = this.shaderManager.getShader('shadow');
    if (!shadowShader) return;
    
    this.renderer.useProgram(shadowShader.getProgram());
    
    // Get directional light for shadow mapping
    const directionalLights = this.lightingSystem.getDirectionalLights();
    if (directionalLights.length === 0) return;
    
    const light = directionalLights[0];
    const lightViewMatrix = light.getViewMatrix();
    const lightProjectionMatrix = light.getProjectionMatrix();
    const lightViewProjectionMatrix = mat4.create();
    mat4.multiply(lightViewProjectionMatrix, lightProjectionMatrix, lightViewMatrix);
    
    // Set shader uniforms
    shadowShader.setUniform('u_lightViewProjectionMatrix', 'mat4', lightViewProjectionMatrix);
    
    // Render shadow casters
    const shadowCasters = this.getShadowCasters(sceneGraph, gameObjects);
    for (const gameObject of shadowCasters) {
      if (!gameObject.getCastShadows()) continue;
      
      const mesh = gameObject.getMesh();
      const transform = gameObject.getTransform();
      
      if (mesh && transform) {
        const modelMatrix = transform.getWorldMatrix();
        shadowShader.setUniform('u_modelMatrix', 'mat4', modelMatrix);
        
        this.renderMesh(mesh);
        this.stats.shadowDrawCalls++;
      }
    }
  }

  private renderGBufferPass(sceneGraph: SceneGraph, gameObjects: Map<string, GameObject>): void {
    const gbufferShader = this.shaderManager.getShader('gbuffer');
    if (!gbufferShader) return;
    
    this.renderer.useProgram(gbufferShader.getProgram());
    
    // Set common uniforms
    gbufferShader.setUniform('u_viewMatrix', 'mat4', this.viewMatrix);
    gbufferShader.setUniform('u_projectionMatrix', 'mat4', this.projectionMatrix);
    gbufferShader.setUniform('u_viewProjectionMatrix', 'mat4', this.viewProjectionMatrix);
    gbufferShader.setUniform('u_cameraPosition', 'vec3', this.cameraPosition);
    
    // Add temporal jitter for TAA
    if (this.antiAliasing === 'taa') {
      const jitter = this.haltonSequence[this.temporalIndex];
      gbufferShader.setUniform('u_jitterOffset', 'vec2', [jitter[0], jitter[1]]);
    }
    
    // Render opaque objects
    const opaqueObjects = this.getOpaqueObjects(sceneGraph, gameObjects);
    for (const gameObject of opaqueObjects) {
      const mesh = gameObject.getMesh();
      const material = gameObject.getMaterial();
      const transform = gameObject.getTransform();
      
      if (mesh && material && transform) {
        const modelMatrix = transform.getWorldMatrix();
        gbufferShader.setUniform('u_modelMatrix', 'mat4', modelMatrix);
        
        // Bind material textures
        material.bind(gbufferShader);
        
        this.renderMesh(mesh);
        this.stats.opaqueDrawCalls++;
      }
    }
  }

  private renderSSAOPass(): void {
    if (!this.enableSSAO) return;
    
    const ssaoShader = this.shaderManager.getShader('ssao');
    if (!ssaoShader) return;
    
    this.renderer.useProgram(ssaoShader.getProgram());
    
    // Bind G-Buffer textures
    const gBufferTextures = this.gBuffer.getColorTextures();
    gBufferTextures[2]?.bind(0); // Normal+Roughness
    this.gBuffer.getDepthTexture()?.bind(1);
    
    ssaoShader.setUniform('u_normalTexture', 'sampler2D', 0);
    ssaoShader.setUniform('u_depthTexture', 'sampler2D', 1);
    ssaoShader.setUniform('u_projectionMatrix', 'mat4', this.projectionMatrix);
    
    this.renderFullscreenQuad();
    this.stats.postProcessPasses++;
  }

  private renderLightingPass(): void {
    const lightingShader = this.shaderManager.getShader('lighting');
    if (!lightingShader) return;
    
    this.renderer.useProgram(lightingShader.getProgram());
    
    // Bind G-Buffer textures
    const gBufferTextures = this.gBuffer.getColorTextures();
    gBufferTextures[0]?.bind(0); // Albedo+Metallic
    gBufferTextures[1]?.bind(1); // Normal+Roughness
    gBufferTextures[2]?.bind(2); // Motion+Depth
    gBufferTextures[3]?.bind(3); // Emission+AO
    this.gBuffer.getDepthTexture()?.bind(4);
    this.shadowMapBuffer.getDepthTexture()?.bind(5);
    
    // Set texture uniforms
    lightingShader.setUniform('u_albedoMetallicTexture', 'sampler2D', 0);
    lightingShader.setUniform('u_normalRoughnessTexture', 'sampler2D', 1);
    lightingShader.setUniform('u_motionDepthTexture', 'sampler2D', 2);
    lightingShader.setUniform('u_emissionAOTexture', 'sampler2D', 3);
    lightingShader.setUniform('u_depthTexture', 'sampler2D', 4);
    lightingShader.setUniform('u_shadowMapTexture', 'sampler2D', 5);
    
    // Set camera uniforms
    lightingShader.setUniform('u_viewMatrix', 'mat4', this.viewMatrix);
    lightingShader.setUniform('u_projectionMatrix', 'mat4', this.projectionMatrix);
    lightingShader.setUniform('u_inverseViewMatrix', 'mat4', mat4.invert(mat4.create(), this.viewMatrix));
    lightingShader.setUniform('u_inverseProjectionMatrix', 'mat4', mat4.invert(mat4.create(), this.projectionMatrix));
    lightingShader.setUniform('u_cameraPosition', 'vec3', this.cameraPosition);
    
    // Set lighting uniforms
    this.lightingSystem.bindLights(lightingShader);
    
    this.renderFullscreenQuad();
    this.stats.postProcessPasses++;
  }

  private renderTransparentPass(sceneGraph: SceneGraph, gameObjects: Map<string, GameObject>): void {
    const forwardShader = this.shaderManager.getShader('forward');
    if (!forwardShader) return;
    
    // Enable blending for transparency
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    
    this.renderer.useProgram(forwardShader.getProgram());
    
    // Set common uniforms
    forwardShader.setUniform('u_viewMatrix', 'mat4', this.viewMatrix);
    forwardShader.setUniform('u_projectionMatrix', 'mat4', this.projectionMatrix);
    forwardShader.setUniform('u_cameraPosition', 'vec3', this.cameraPosition);
    
    // Bind lighting
    this.lightingSystem.bindLights(forwardShader);
    
    // Render transparent objects back-to-front
    const transparentObjects = this.getTransparentObjects(sceneGraph, gameObjects);
    sceneGraph.sortNodesByDistance(this.cameraPosition, true);
    
    for (const gameObject of transparentObjects) {
      const mesh = gameObject.getMesh();
      const material = gameObject.getMaterial();
      const transform = gameObject.getTransform();
      
      if (mesh && material && transform) {
        const modelMatrix = transform.getWorldMatrix();
        forwardShader.setUniform('u_modelMatrix', 'mat4', modelMatrix);
        
        material.bind(forwardShader);
        
        this.renderMesh(mesh);
        this.stats.transparentDrawCalls++;
      }
    }
    
    this.gl.disable(this.gl.BLEND);
  }

  private renderBloomPass(): void {
    if (!this.enableBloom) return;
    
    // Extract bright pixels
    const extractShader = this.shaderManager.getShader('bloom_extract');
    if (extractShader) {
      this.renderer.useProgram(extractShader.getProgram());
      
      this.lightingBuffer.getColorTexture(0)?.bind(0);
      extractShader.setUniform('u_sourceTexture', 'sampler2D', 0);
      extractShader.setUniform('u_threshold', 'float', 1.0);
      
      this.renderFullscreenQuad();
    }
    
    // Blur passes
    const blurShader = this.shaderManager.getShader('bloom_blur');
    if (blurShader) {
      this.renderer.useProgram(blurShader.getProgram());
      
      // Horizontal blur
      this.bloomBuffer.getColorTexture(0)?.bind(0);
      blurShader.setUniform('u_sourceTexture', 'sampler2D', 0);
      blurShader.setUniform('u_direction', 'vec2', [1.0, 0.0]);
      this.renderFullscreenQuad();
      
      // Vertical blur
      blurShader.setUniform('u_direction', 'vec2', [0.0, 1.0]);
      this.renderFullscreenQuad();
    }
    
    this.stats.postProcessPasses += 3; // Extract + 2 blur passes
  }

  private renderToneMappingPass(): void {
    if (!this.enableToneMapping) return;
    
    const tonemapShader = this.shaderManager.getShader('tonemap');
    if (!tonemapShader) return;
    
    this.renderer.useProgram(tonemapShader.getProgram());
    
    this.lightingBuffer.getColorTexture(0)?.bind(0);
    this.bloomBuffer.getColorTexture(0)?.bind(1);
    this.exposureTexture.bind(2);
    
    tonemapShader.setUniform('u_hdrTexture', 'sampler2D', 0);
    tonemapShader.setUniform('u_bloomTexture', 'sampler2D', 1);
    tonemapShader.setUniform('u_exposureTexture', 'sampler2D', 2);
    tonemapShader.setUniform('u_exposure', 'float', 1.0);
    tonemapShader.setUniform('u_bloomStrength', 'float', 0.04);
    
    this.renderFullscreenQuad();
    this.stats.postProcessPasses++;
  }

  private renderAntiAliasingPass(): void {
    if (this.antiAliasing === 'none') return;
    
    let shader;
    if (this.antiAliasing === 'fxaa') {
      shader = this.shaderManager.getShader('fxaa');
    } else if (this.antiAliasing === 'taa') {
      shader = this.shaderManager.getShader('taa');
    }
    
    if (!shader) return;
    
    this.renderer.useProgram(shader.getProgram());
    
    this.postProcessBuffer1.getColorTexture(0)?.bind(0);
    shader.setUniform('u_sourceTexture', 'sampler2D', 0);
    
    if (this.antiAliasing === 'fxaa') {
      const texelSize = [
        1.0 / this.postProcessBuffer1.getWidth(),
        1.0 / this.postProcessBuffer1.getHeight()
      ];
      shader.setUniform('u_texelSize', 'vec2', texelSize);
    } else if (this.antiAliasing === 'taa') {
      // Bind previous frame for TAA
      shader.setUniform('u_previousTexture', 'sampler2D', 1);
      shader.setUniform('u_velocityTexture', 'sampler2D', 2);
      
      const gBufferTextures = this.gBuffer.getColorTextures();
      gBufferTextures[2]?.bind(2); // Motion vectors
    }
    
    this.renderFullscreenQuad();
    this.stats.postProcessPasses++;
  }

  private renderFullscreenQuad(): void {
    const quadMesh = this.renderer.getQuadMesh();
    this.renderMesh(quadMesh);
  }

  private renderMesh(mesh: any): void {
    this.renderer.bindVertexArray(mesh.getVAO());
    
    if (mesh.getInstanceCount() > 1) {
      this.renderer.drawElementsInstanced(
        mesh.getPrimitiveType(),
        mesh.getIndexCount(),
        this.gl.UNSIGNED_SHORT,
        0,
        mesh.getInstanceCount()
      );
    } else {
      this.renderer.drawElements(
        mesh.getPrimitiveType(),
        mesh.getIndexCount(),
        this.gl.UNSIGNED_SHORT,
        0
      );
    }
    
    this.stats.totalDrawCalls++;
    this.stats.trianglesRendered += mesh.getIndexCount() / 3;
  }

  private getShadowCasters(sceneGraph: SceneGraph, gameObjects: Map<string, GameObject>): GameObject[] {
    return Array.from(gameObjects.values()).filter(obj => 
      obj.isVisible() && obj.getCastShadows() && obj.getMesh()
    );
  }

  private getOpaqueObjects(sceneGraph: SceneGraph, gameObjects: Map<string, GameObject>): GameObject[] {
    return Array.from(gameObjects.values()).filter(obj => {
      const material = obj.getMaterial();
      return obj.isVisible() && obj.getMesh() && material && !material.isTransparent();
    });
  }

  private getTransparentObjects(sceneGraph: SceneGraph, gameObjects: Map<string, GameObject>): GameObject[] {
    return Array.from(gameObjects.values()).filter(obj => {
      const material = obj.getMaterial();
      return obj.isVisible() && obj.getMesh() && material && material.isTransparent();
    });
  }

  public resize(width: number, height: number): void {
    this.gBuffer.resize(width, height);
    this.lightingBuffer.resize(width, height);
    this.hdrBuffer.resize(width, height);
    this.postProcessBuffer1.resize(width, height);
    this.postProcessBuffer2.resize(width, height);
    this.finalBuffer.resize(width, height);
    
    // Bloom buffer is quarter resolution
    this.bloomBuffer.resize(width / 4, height / 4);
  }

  public setAntiAliasing(type: 'none' | 'fxaa' | 'msaa' | 'taa'): void {
    this.antiAliasing = type;
    const pass = this.renderPasses.get('antialiasing');
    if (pass) {
      pass.enabled = type !== 'none';
    }
  }

  public enablePass(passName: string, enabled: boolean): void {
    const pass = this.renderPasses.get(passName);
    if (pass) {
      pass.enabled = enabled;
    }
  }

  public getFinalTexture(): Texture | null {
    return this.finalBuffer.getColorTexture(0);
  }

  public getStats(): RenderStats {
    return { ...this.stats };
  }

  public cleanup(): void {
    this.gBuffer.cleanup();
    this.shadowMapBuffer.cleanup();
    this.lightingBuffer.cleanup();
    this.hdrBuffer.cleanup();
    this.bloomBuffer.cleanup();
    this.postProcessBuffer1.cleanup();
    this.postProcessBuffer2.cleanup();
    this.finalBuffer.cleanup();
    this.exposureTexture.cleanup();
  }
}