/**
 * Advanced Shader Management System
 * Handles shader compilation, linking, and uniform management
 */

import { Shader } from './Shader';
import { ShaderProgram } from './ShaderProgram';

export interface ShaderSource {
  vertex: string;
  fragment: string;
  geometry?: string;
  compute?: string;
}

export interface ShaderDefines {
  [key: string]: string | number | boolean;
}

export interface ShaderVariant {
  name: string;
  defines: ShaderDefines;
  program: ShaderProgram;
}

export class ShaderManager {
  private gl: WebGL2RenderingContext;
  private shaders: Map<string, Shader> = new Map();
  private programs: Map<string, ShaderProgram> = new Map();
  private variants: Map<string, ShaderVariant[]> = new Map();
  private includeCache: Map<string, string> = new Map();
  
  // Precompiled shader cache
  private compiledShaders: Map<string, WebGLShader> = new Map();
  
  // Hot reload support
  private fileWatchers: Map<string, FileSystemWatcher | null> = new Map();
  private hotReloadEnabled: boolean = false;
  
  // Shader statistics
  private stats = {
    shadersLoaded: 0,
    programsCreated: 0,
    variantsGenerated: 0,
    compilationErrors: 0,
    linkingErrors: 0,
    uniformUpdates: 0
  };

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.loadBuiltInIncludes();
  }

  public async initialize(): Promise<void> {
    await this.loadBuiltInShaders();
    console.log('✅ Shader Manager initialized');
  }

  private async loadBuiltInIncludes(): Promise<void> {
    // Common shader includes
    this.includeCache.set('common.glsl', `
      #define PI 3.14159265359
      #define TWO_PI 6.28318530718
      #define HALF_PI 1.57079632679
      #define INV_PI 0.31830988618
      #define EPSILON 1e-6
      
      // Utility functions
      float saturate(float x) { return clamp(x, 0.0, 1.0); }
      vec2 saturate(vec2 x) { return clamp(x, 0.0, 1.0); }
      vec3 saturate(vec3 x) { return clamp(x, 0.0, 1.0); }
      vec4 saturate(vec4 x) { return clamp(x, 0.0, 1.0); }
      
      float pow2(float x) { return x * x; }
      float pow3(float x) { return x * x * x; }
      float pow4(float x) { float x2 = x * x; return x2 * x2; }
      float pow5(float x) { float x2 = x * x; return x2 * x2 * x; }
      
      float luminance(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }
      
      vec3 linearToSRGB(vec3 color) {
        return pow(color, vec3(1.0 / 2.2));
      }
      
      vec3 sRGBToLinear(vec3 color) {
        return pow(color, vec3(2.2));
      }
    `);
    
    this.includeCache.set('lighting.glsl', `
      struct DirectionalLight {
        vec3 direction;
        vec3 color;
        float intensity;
        mat4 shadowMatrix;
        int castShadows;
      };
      
      struct PointLight {
        vec3 position;
        vec3 color;
        float intensity;
        float range;
        float attenuation;
      };
      
      struct SpotLight {
        vec3 position;
        vec3 direction;
        vec3 color;
        float intensity;
        float range;
        float innerCone;
        float outerCone;
        float attenuation;
      };
      
      // PBR lighting calculations
      vec3 fresnelSchlick(float cosTheta, vec3 F0) {
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
      }
      
      vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
        return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
      }
      
      float distributionGGX(vec3 N, vec3 H, float roughness) {
        float a = roughness * roughness;
        float a2 = a * a;
        float NdotH = max(dot(N, H), 0.0);
        float NdotH2 = NdotH * NdotH;
        
        float num = a2;
        float denom = (NdotH2 * (a2 - 1.0) + 1.0);
        denom = PI * denom * denom;
        
        return num / denom;
      }
      
      float geometrySchlickGGX(float NdotV, float roughness) {
        float r = (roughness + 1.0);
        float k = (r * r) / 8.0;
        
        float num = NdotV;
        float denom = NdotV * (1.0 - k) + k;
        
        return num / denom;
      }
      
      float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        float ggx2 = geometrySchlickGGX(NdotV, roughness);
        float ggx1 = geometrySchlickGGX(NdotL, roughness);
        
        return ggx1 * ggx2;
      }
    `);
    
    this.includeCache.set('noise.glsl', `
      // Simplex noise functions
      vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }
      
      vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }
      
      vec4 permute(vec4 x) {
        return mod289(((x*34.0)+1.0)*x);
      }
      
      vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
      }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        i = mod289(i);
        vec4 p = permute(permute(permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      
      float fbm(vec3 p, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for(int i = 0; i < octaves; i++) {
          value += amplitude * snoise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        
        return value;
      }
    `);
    
    this.includeCache.set('postprocess.glsl', `
      // Post-processing utility functions
      vec3 ACESFilm(vec3 x) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return saturate((x*(a*x+b))/(x*(c*x+d)+e));
      }
      
      vec3 reinhard(vec3 color) {
        return color / (1.0 + color);
      }
      
      vec3 reinhardExtended(vec3 color, float maxWhite) {
        vec3 numerator = color * (1.0 + (color / vec3(maxWhite * maxWhite)));
        return numerator / (1.0 + color);
      }
      
      vec3 uncharted2Tonemap(vec3 color) {
        float A = 0.15;
        float B = 0.50;
        float C = 0.10;
        float D = 0.20;
        float E = 0.02;
        float F = 0.30;
        
        return ((color*(A*color+C*B)+D*E)/(color*(A*color+B)+D*F))-E/F;
      }
      
      float vignette(vec2 uv, float intensity, float extent) {
        vec2 coord = (uv - 0.5) * (intensity, extent);
        return 1.0 - dot(coord, coord);
      }
      
      vec3 chromatic_aberration(sampler2D tex, vec2 uv, float strength) {
        vec2 offset = (uv - 0.5) * strength;
        float r = texture(tex, uv + offset).r;
        float g = texture(tex, uv).g;
        float b = texture(tex, uv - offset).b;
        return vec3(r, g, b);
      }
    `);
  }

  private async loadBuiltInShaders(): Promise<void> {
    // Load essential shaders
    const shaderSources = new Map<string, ShaderSource>();
    
    // Basic vertex shader
    shaderSources.set('basic', {
      vertex: `#version 300 es
        precision highp float;
        
        layout(location = 0) in vec3 a_position;
        layout(location = 1) in vec3 a_normal;
        layout(location = 2) in vec2 a_texCoord;
        
        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projectionMatrix;
        uniform mat4 u_normalMatrix;
        
        out vec3 v_worldPosition;
        out vec3 v_normal;
        out vec2 v_texCoord;
        
        void main() {
          vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
          v_worldPosition = worldPosition.xyz;
          v_normal = normalize((u_normalMatrix * vec4(a_normal, 0.0)).xyz);
          v_texCoord = a_texCoord;
          
          gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
        }`,
      fragment: `#version 300 es
        precision highp float;
        
        in vec3 v_worldPosition;
        in vec3 v_normal;
        in vec2 v_texCoord;
        
        uniform vec3 u_albedo;
        uniform float u_metallic;
        uniform float u_roughness;
        uniform sampler2D u_albedoTexture;
        
        out vec4 fragColor;
        
        void main() {
          vec3 albedo = u_albedo * texture(u_albedoTexture, v_texCoord).rgb;
          fragColor = vec4(albedo, 1.0);
        }`
    });
    
    // Fullscreen quad shader
    shaderSources.set('fullscreen', {
      vertex: `#version 300 es
        precision highp float;
        
        layout(location = 0) in vec3 a_position;
        layout(location = 1) in vec2 a_texCoord;
        
        out vec2 v_texCoord;
        
        void main() {
          v_texCoord = a_texCoord;
          gl_Position = vec4(a_position, 1.0);
        }`,
      fragment: `#version 300 es
        precision highp float;
        
        in vec2 v_texCoord;
        
        uniform sampler2D u_texture;
        
        out vec4 fragColor;
        
        void main() {
          fragColor = texture(u_texture, v_texCoord);
        }`
    });
    
    // Load each built-in shader
    for (const [name, source] of shaderSources) {
      await this.createShaderFromSource(name, source);
    }
  }

  public async loadShader(name: string, vertexPath: string, fragmentPath: string, geometryPath?: string): Promise<void> {
    try {
      const [vertexSource, fragmentSource, geometrySource] = await Promise.all([
        this.loadShaderFile(vertexPath),
        this.loadShaderFile(fragmentPath),
        geometryPath ? this.loadShaderFile(geometryPath) : Promise.resolve(undefined)
      ]);
      
      const source: ShaderSource = {
        vertex: vertexSource,
        fragment: fragmentSource,
        geometry: geometrySource
      };
      
      await this.createShaderFromSource(name, source);
      
      // Setup hot reload if enabled
      if (this.hotReloadEnabled) {
        this.setupHotReload(name, [vertexPath, fragmentPath, geometryPath].filter(Boolean) as string[]);
      }
      
      this.stats.shadersLoaded++;
      
    } catch (error) {
      console.error(`Failed to load shader ${name}:`, error);
      this.stats.compilationErrors++;
      throw error;
    }
  }

  private async loadShaderFile(path: string): Promise<string> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Failed to load shader file ${path}:`, error);
      throw error;
    }
  }

  private async createShaderFromSource(name: string, source: ShaderSource, defines?: ShaderDefines): Promise<void> {
    const processedSource = this.preprocessShader(source, defines);
    
    const vertexShader = this.compileShader(processedSource.vertex, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(processedSource.fragment, this.gl.FRAGMENT_SHADER);
    let geometryShader: WebGLShader | null = null;
    
    if (processedSource.geometry) {
      geometryShader = this.compileShader(processedSource.geometry, this.gl.GEOMETRY_SHADER);
    }
    
    const program = this.linkProgram([vertexShader, fragmentShader, geometryShader].filter(Boolean) as WebGLShader[]);
    
    const shader = new Shader(name, source);
    const shaderProgram = new ShaderProgram(this.gl, program, shader);
    
    this.shaders.set(name, shader);
    this.programs.set(name, shaderProgram);
    
    this.stats.programsCreated++;
  }

  private preprocessShader(source: ShaderSource, defines?: ShaderDefines): ShaderSource {
    return {
      vertex: this.processShaderSource(source.vertex, defines),
      fragment: this.processShaderSource(source.fragment, defines),
      geometry: source.geometry ? this.processShaderSource(source.geometry, defines) : undefined
    };
  }

  private processShaderSource(source: string, defines?: ShaderDefines): string {
    let processed = source;
    
    // Process defines
    if (defines) {
      let defineString = '';
      for (const [key, value] of Object.entries(defines)) {
        if (typeof value === 'boolean') {
          if (value) {
            defineString += `#define ${key}\n`;
          }
        } else {
          defineString += `#define ${key} ${value}\n`;
        }
      }
      
      // Insert defines after version directive
      const versionMatch = processed.match(/#version\s+\d+\s+\w+/);
      if (versionMatch) {
        const insertIndex = versionMatch.index! + versionMatch[0].length;
        processed = processed.slice(0, insertIndex) + '\n' + defineString + processed.slice(insertIndex);
      } else {
        processed = defineString + processed;
      }
    }
    
    // Process includes
    processed = this.processIncludes(processed);
    
    return processed;
  }

  private processIncludes(source: string): string {
    const includeRegex = /#include\s+"([^"]+)"/g;
    let processed = source;
    let match;
    
    while ((match = includeRegex.exec(processed)) !== null) {
      const includeName = match[1];
      const includeContent = this.includeCache.get(includeName);
      
      if (includeContent) {
        processed = processed.replace(match[0], includeContent);
      } else {
        console.warn(`Include not found: ${includeName}`);
      }
    }
    
    return processed;
  }

  private compileShader(source: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${log}`);
    }
    
    return shader;
  }

  private linkProgram(shaders: WebGLShader[]): WebGLProgram {
    const program = this.gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }
    
    for (const shader of shaders) {
      this.gl.attachShader(program, shader);
    }
    
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program linking failed: ${log}`);
    }
    
    // Clean up shaders after linking
    for (const shader of shaders) {
      this.gl.detachShader(program, shader);
      this.gl.deleteShader(shader);
    }
    
    return program;
  }

  public createVariant(baseName: string, variantName: string, defines: ShaderDefines): void {
    const baseShader = this.shaders.get(baseName);
    if (!baseShader) {
      throw new Error(`Base shader not found: ${baseName}`);
    }
    
    const fullName = `${baseName}_${variantName}`;
    this.createShaderFromSource(fullName, baseShader.getSource(), defines);
    
    // Store variant info
    if (!this.variants.has(baseName)) {
      this.variants.set(baseName, []);
    }
    
    const variants = this.variants.get(baseName)!;
    variants.push({
      name: variantName,
      defines,
      program: this.programs.get(fullName)!
    });
    
    this.stats.variantsGenerated++;
  }

  public getShader(name: string): ShaderProgram | null {
    return this.programs.get(name) || null;
  }

  public getVariant(baseName: string, defines: ShaderDefines): ShaderProgram | null {
    const variants = this.variants.get(baseName);
    if (!variants) return null;
    
    // Find matching variant
    for (const variant of variants) {
      if (this.definesMatch(variant.defines, defines)) {
        return variant.program;
      }
    }
    
    return null;
  }

  private definesMatch(a: ShaderDefines, b: ShaderDefines): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }
    
    return true;
  }

  public reloadShader(name: string): void {
    const shader = this.shaders.get(name);
    if (!shader) {
      console.warn(`Shader not found for reload: ${name}`);
      return;
    }
    
    try {
      this.createShaderFromSource(name, shader.getSource());
      console.log(`✅ Reloaded shader: ${name}`);
    } catch (error) {
      console.error(`❌ Failed to reload shader ${name}:`, error);
    }
  }

  private setupHotReload(name: string, paths: string[]): void {
    // Hot reload would be implemented here for development
    // This is a placeholder for the concept
    console.log(`🔥 Hot reload setup for shader: ${name}`);
  }

  public enableHotReload(enabled: boolean): void {
    this.hotReloadEnabled = enabled;
  }

  public addInclude(name: string, source: string): void {
    this.includeCache.set(name, source);
  }

  public removeInclude(name: string): void {
    this.includeCache.delete(name);
  }

  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  public getAllShaderNames(): string[] {
    return Array.from(this.programs.keys());
  }

  public cleanup(): void {
    // Clean up all programs
    for (const program of this.programs.values()) {
      program.cleanup();
    }
    
    // Clear collections
    this.shaders.clear();
    this.programs.clear();
    this.variants.clear();
    this.compiledShaders.clear();
    this.includeCache.clear();
    
    console.log('✅ Shader Manager cleanup complete');
  }
}

// File system watcher interface (would be implemented differently in browser vs Node.js)
interface FileSystemWatcher {
  close(): void;
}