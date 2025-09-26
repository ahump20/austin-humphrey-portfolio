/**
 * Advanced WebGL 2.0 Renderer
 * High-performance rendering system with modern graphics features
 */

import { Mesh } from './Mesh';
import { VertexBuffer } from './VertexBuffer';
import { IndexBuffer } from './IndexBuffer';
import { FrameBuffer } from './FrameBuffer';
import { Texture } from './Texture';

export interface WebGLCapabilities {
  maxTextureSize: number;
  maxCombinedTextureImageUnits: number;
  maxVertexTextureImageUnits: number;
  maxVaryingVectors: number;
  maxVertexAttribs: number;
  maxVertexUniformVectors: number;
  maxFragmentUniformVectors: number;
  maxRenderBufferSize: number;
  maxViewportDims: number[];
  extensions: string[];
  supportsFloatTextures: boolean;
  supportsHalfFloatTextures: boolean;
  supportsDepthTextures: boolean;
  supportsInstancedArrays: boolean;
  supportsVertexArrayObjects: boolean;
  supportsMultipleRenderTargets: boolean;
  supportsAnisotropicFiltering: boolean;
  maxAnisotropy: number;
}

export interface RenderStats {
  drawCalls: number;
  triangles: number;
  vertices: number;
  textureBinds: number;
  shaderSwitches: number;
  stateChanges: number;
}

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private capabilities: WebGLCapabilities;
  private stats: RenderStats;
  
  private currentProgram: WebGLProgram | null = null;
  private currentVAO: WebGLVertexArrayObject | null = null;
  private currentFramebuffer: WebGLFramebuffer | null = null;
  private boundTextures: Map<number, WebGLTexture | null> = new Map();
  
  private vertexBuffers: Map<string, VertexBuffer> = new Map();
  private indexBuffers: Map<string, IndexBuffer> = new Map();
  private framebuffers: Map<string, FrameBuffer> = new Map();
  private textures: Map<string, Texture> = new Map();
  private vaos: Map<string, WebGLVertexArrayObject> = new Map();
  
  private extensions: Map<string, any> = new Map();
  
  // Built-in geometries
  private quadMesh: Mesh | null = null;
  private cubeMesh: Mesh | null = null;
  private sphereMesh: Mesh | null = null;
  private planeMesh: Mesh | null = null;
  
  constructor(private config: { canvas: HTMLCanvasElement; width: number; height: number; pixelRatio: number }) {
    this.canvas = config.canvas;
    this.resetStats();
  }

  public async initialize(): Promise<void> {
    // Get WebGL2 context
    this.gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: true,
      stencil: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    }) as WebGL2RenderingContext;

    if (!this.gl) {
      throw new Error('WebGL 2.0 not supported');
    }

    // Enable extensions
    await this.loadExtensions();
    
    // Query capabilities
    this.queryCapabilities();
    
    // Setup initial state
    this.setupInitialState();
    
    // Create built-in geometries
    this.createBuiltInGeometries();
    
    console.log('✅ WebGL2 Renderer initialized');
    console.log('📊 Capabilities:', this.capabilities);
  }

  private async loadExtensions(): Promise<void> {
    const requiredExtensions = [
      'EXT_color_buffer_float',
      'EXT_texture_filter_anisotropic',
      'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders',
      'OES_texture_float_linear',
      'EXT_float_blend'
    ];

    const optionalExtensions = [
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_pvrtc',
      'WEBGL_compressed_texture_etc1',
      'WEBGL_lose_context',
      'WEBGL_multi_draw'
    ];

    for (const ext of [...requiredExtensions, ...optionalExtensions]) {
      const extension = this.gl.getExtension(ext);
      if (extension) {
        this.extensions.set(ext, extension);
        console.log(`✅ Loaded extension: ${ext}`);
      } else if (requiredExtensions.includes(ext)) {
        console.warn(`⚠️ Required extension not available: ${ext}`);
      }
    }
  }

  private queryCapabilities(): void {
    const gl = this.gl;
    
    this.capabilities = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      extensions: Array.from(this.extensions.keys()),
      supportsFloatTextures: this.extensions.has('OES_texture_float'),
      supportsHalfFloatTextures: this.extensions.has('OES_texture_half_float'),
      supportsDepthTextures: this.extensions.has('WEBGL_depth_texture'),
      supportsInstancedArrays: true, // WebGL2 built-in
      supportsVertexArrayObjects: true, // WebGL2 built-in
      supportsMultipleRenderTargets: true, // WebGL2 built-in
      supportsAnisotropicFiltering: this.extensions.has('EXT_texture_filter_anisotropic'),
      maxAnisotropy: this.extensions.has('EXT_texture_filter_anisotropic') ? 
        gl.getParameter(this.extensions.get('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1
    };
  }

  private setupInitialState(): void {
    const gl = this.gl;
    
    // Set viewport
    gl.viewport(0, 0, this.config.width, this.config.height);
    
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    
    // Enable face culling
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    
    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clearStencil(0);
    
    // Initialize texture units
    for (let i = 0; i < this.capabilities.maxCombinedTextureImageUnits; i++) {
      this.boundTextures.set(i, null);
    }
  }

  private createBuiltInGeometries(): void {
    // Create full-screen quad
    this.quadMesh = this.createQuadMesh();
    
    // Create unit cube
    this.cubeMesh = this.createCubeMesh();
    
    // Create unit sphere
    this.sphereMesh = this.createSphereMesh(1.0, 32, 16);
    
    // Create unit plane
    this.planeMesh = this.createPlaneMesh(1.0, 1.0, 1, 1);
  }

  public createQuadMesh(): Mesh {
    const vertices = new Float32Array([
      -1, -1, 0,  0, 0,
       1, -1, 0,  1, 0,
       1,  1, 0,  1, 1,
      -1,  1, 0,  0, 1
    ]);
    
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    
    const vertexBuffer = new VertexBuffer(this.gl, vertices);
    const indexBuffer = new IndexBuffer(this.gl, indices);
    
    const vao = this.gl.createVertexArrayObject()!;
    this.gl.bindVertexArrayObject(vao);
    
    vertexBuffer.bind();
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 20, 0);
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 2, this.gl.FLOAT, false, 20, 12);
    
    indexBuffer.bind();
    this.gl.bindVertexArrayObject(null);
    
    return new Mesh(vertexBuffer, indexBuffer, vao, indices.length);
  }

  public createCubeMesh(): Mesh {
    const vertices = new Float32Array([
      // Front face
      -1, -1,  1,  0,  0,  1,  0, 0,
       1, -1,  1,  0,  0,  1,  1, 0,
       1,  1,  1,  0,  0,  1,  1, 1,
      -1,  1,  1,  0,  0,  1,  0, 1,
      
      // Back face
      -1, -1, -1,  0,  0, -1,  1, 0,
      -1,  1, -1,  0,  0, -1,  1, 1,
       1,  1, -1,  0,  0, -1,  0, 1,
       1, -1, -1,  0,  0, -1,  0, 0,
      
      // Top face
      -1,  1, -1,  0,  1,  0,  0, 1,
      -1,  1,  1,  0,  1,  0,  0, 0,
       1,  1,  1,  0,  1,  0,  1, 0,
       1,  1, -1,  0,  1,  0,  1, 1,
      
      // Bottom face
      -1, -1, -1,  0, -1,  0,  1, 1,
       1, -1, -1,  0, -1,  0,  0, 1,
       1, -1,  1,  0, -1,  0,  0, 0,
      -1, -1,  1,  0, -1,  0,  1, 0,
      
      // Right face
       1, -1, -1,  1,  0,  0,  1, 0,
       1,  1, -1,  1,  0,  0,  1, 1,
       1,  1,  1,  1,  0,  0,  0, 1,
       1, -1,  1,  1,  0,  0,  0, 0,
      
      // Left face
      -1, -1, -1, -1,  0,  0,  0, 0,
      -1, -1,  1, -1,  0,  0,  1, 0,
      -1,  1,  1, -1,  0,  0,  1, 1,
      -1,  1, -1, -1,  0,  0,  0, 1
    ]);
    
    const indices = new Uint16Array([
      0,  1,  2,    0,  2,  3,     // front
      4,  5,  6,    4,  6,  7,     // back
      8,  9,  10,   8,  10, 11,    // top
      12, 13, 14,   12, 14, 15,    // bottom
      16, 17, 18,   16, 18, 19,    // right
      20, 21, 22,   20, 22, 23     // left
    ]);
    
    const vertexBuffer = new VertexBuffer(this.gl, vertices);
    const indexBuffer = new IndexBuffer(this.gl, indices);
    
    const vao = this.gl.createVertexArrayObject()!;
    this.gl.bindVertexArrayObject(vao);
    
    vertexBuffer.bind();
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 32, 0);
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 32, 12);
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, 32, 24);
    
    indexBuffer.bind();
    this.gl.bindVertexArrayObject(null);
    
    return new Mesh(vertexBuffer, indexBuffer, vao, indices.length);
  }

  public createSphereMesh(radius: number, widthSegments: number, heightSegments: number): Mesh {
    const vertices: number[] = [];
    const indices: number[] = [];
    
    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      const theta = v * Math.PI;
      
      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments;
        const phi = u * Math.PI * 2;
        
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        
        const px = radius * sinTheta * cosPhi;
        const py = radius * cosTheta;
        const pz = radius * sinTheta * sinPhi;
        
        const nx = sinTheta * cosPhi;
        const ny = cosTheta;
        const nz = sinTheta * sinPhi;
        
        vertices.push(px, py, pz, nx, ny, nz, u, v);
      }
    }
    
    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const a = y * (widthSegments + 1) + x;
        const b = a + widthSegments + 1;
        
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }
    
    const vertexArray = new Float32Array(vertices);
    const indexArray = new Uint16Array(indices);
    
    const vertexBuffer = new VertexBuffer(this.gl, vertexArray);
    const indexBuffer = new IndexBuffer(this.gl, indexArray);
    
    const vao = this.gl.createVertexArrayObject()!;
    this.gl.bindVertexArrayObject(vao);
    
    vertexBuffer.bind();
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 32, 0);
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 32, 12);
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, 32, 24);
    
    indexBuffer.bind();
    this.gl.bindVertexArrayObject(null);
    
    return new Mesh(vertexBuffer, indexBuffer, vao, indexArray.length);
  }

  public createPlaneMesh(width: number, height: number, widthSegments: number, heightSegments: number): Mesh {
    const vertices: number[] = [];
    const indices: number[] = [];
    
    const widthHalf = width / 2;
    const heightHalf = height / 2;
    
    const gridX = widthSegments;
    const gridY = heightSegments;
    
    const segmentWidth = width / gridX;
    const segmentHeight = height / gridY;
    
    for (let iy = 0; iy <= gridY; iy++) {
      const y = iy * segmentHeight - heightHalf;
      
      for (let ix = 0; ix <= gridX; ix++) {
        const x = ix * segmentWidth - widthHalf;
        
        vertices.push(x, 0, -y);  // position
        vertices.push(0, 1, 0);   // normal
        vertices.push(ix / gridX, 1 - (iy / gridY)); // uv
      }
    }
    
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = ix + (gridX + 1) * iy;
        const b = ix + (gridX + 1) * (iy + 1);
        const c = (ix + 1) + (gridX + 1) * (iy + 1);
        const d = (ix + 1) + (gridX + 1) * iy;
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    const vertexArray = new Float32Array(vertices);
    const indexArray = new Uint16Array(indices);
    
    const vertexBuffer = new VertexBuffer(this.gl, vertexArray);
    const indexBuffer = new IndexBuffer(this.gl, indexArray);
    
    const vao = this.gl.createVertexArrayObject()!;
    this.gl.bindVertexArrayObject(vao);
    
    vertexBuffer.bind();
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 32, 0);
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 32, 12);
    this.gl.enableVertexAttribArray(2);
    this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, 32, 24);
    
    indexBuffer.bind();
    this.gl.bindVertexArrayObject(null);
    
    return new Mesh(vertexBuffer, indexBuffer, vao, indexArray.length);
  }

  public useProgram(program: WebGLProgram): void {
    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
      this.stats.shaderSwitches++;
    }
  }

  public bindVertexArray(vao: WebGLVertexArrayObject): void {
    if (this.currentVAO !== vao) {
      this.gl.bindVertexArrayObject(vao);
      this.currentVAO = vao;
      this.stats.stateChanges++;
    }
  }

  public bindFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (this.currentFramebuffer !== framebuffer) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
      this.currentFramebuffer = framebuffer;
      this.stats.stateChanges++;
    }
  }

  public bindTexture(unit: number, texture: WebGLTexture | null): void {
    if (this.boundTextures.get(unit) !== texture) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.boundTextures.set(unit, texture);
      this.stats.textureBinds++;
    }
  }

  public drawElements(mode: number, count: number, type: number, offset: number): void {
    this.gl.drawElements(mode, count, type, offset);
    this.stats.drawCalls++;
    this.stats.triangles += count / 3;
  }

  public drawElementsInstanced(mode: number, count: number, type: number, offset: number, instanceCount: number): void {
    this.gl.drawElementsInstanced(mode, count, type, offset, instanceCount);
    this.stats.drawCalls++;
    this.stats.triangles += (count / 3) * instanceCount;
  }

  public clear(mask: number): void {
    this.gl.clear(mask);
  }

  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  public resetStats(): void {
    this.stats = {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      textureBinds: 0,
      shaderSwitches: 0,
      stateChanges: 0
    };
  }

  public getContext(): WebGL2RenderingContext {
    return this.gl;
  }

  public getCapabilities(): WebGLCapabilities {
    return this.capabilities;
  }

  public getStats(): RenderStats {
    return { ...this.stats };
  }

  public getDrawCalls(): number {
    return this.stats.drawCalls;
  }

  public getTriangleCount(): number {
    return this.stats.triangles;
  }

  public getVertexCount(): number {
    return this.stats.vertices;
  }

  public getMemoryUsage(): number {
    // Approximate memory usage calculation
    let memoryUsage = 0;
    
    // Vertex buffers
    for (const vb of this.vertexBuffers.values()) {
      memoryUsage += vb.getSize();
    }
    
    // Index buffers
    for (const ib of this.indexBuffers.values()) {
      memoryUsage += ib.getSize();
    }
    
    // Textures
    for (const texture of this.textures.values()) {
      memoryUsage += texture.getMemoryUsage();
    }
    
    return memoryUsage;
  }

  public getQuadMesh(): Mesh {
    return this.quadMesh!;
  }

  public getCubeMesh(): Mesh {
    return this.cubeMesh!;
  }

  public getSphereMesh(): Mesh {
    return this.sphereMesh!;
  }

  public getPlaneMesh(): Mesh {
    return this.planeMesh!;
  }

  public cleanup(): void {
    // Clean up vertex buffers
    for (const vb of this.vertexBuffers.values()) {
      vb.cleanup();
    }
    this.vertexBuffers.clear();
    
    // Clean up index buffers
    for (const ib of this.indexBuffers.values()) {
      ib.cleanup();
    }
    this.indexBuffers.clear();
    
    // Clean up framebuffers
    for (const fb of this.framebuffers.values()) {
      fb.cleanup();
    }
    this.framebuffers.clear();
    
    // Clean up textures
    for (const texture of this.textures.values()) {
      texture.cleanup();
    }
    this.textures.clear();
    
    // Clean up VAOs
    for (const vao of this.vaos.values()) {
      this.gl.deleteVertexArrayObject(vao);
    }
    this.vaos.clear();
    
    // Clean up built-in meshes
    if (this.quadMesh) this.quadMesh.cleanup();
    if (this.cubeMesh) this.cubeMesh.cleanup();
    if (this.sphereMesh) this.sphereMesh.cleanup();
    if (this.planeMesh) this.planeMesh.cleanup();
    
    console.log('✅ WebGL Renderer cleanup complete');
  }
}