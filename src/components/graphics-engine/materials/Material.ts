/**
 * Base Material Class
 * Foundation for all material types
 */

import { ShaderManager } from '../shaders/ShaderManager';
import { ShaderProgram, UniformType, UniformValue } from '../shaders/ShaderProgram';
import { Texture } from '../core/Texture';

export interface MaterialConfig {
  name: string;
  shaderName: string;
  uniforms: Record<string, { type: UniformType; value: UniformValue }>;
  textures?: Map<string, Texture>;
  blending?: boolean;
  doubleSided?: boolean;
  transparent?: boolean;
  alphaTest?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
  cullFace?: 'front' | 'back' | 'none';
  renderOrder?: number;
}

export interface MaterialTemplate {
  name: string;
  type: string;
  description: string;
  defaultConfig: MaterialConfig;
  requiredTextures: string[];
  optionalTextures: string[];
  parameters: Record<string, any>;
}

export abstract class Material {
  protected shaderManager: ShaderManager;
  protected config: MaterialConfig;
  protected shader: ShaderProgram | null = null;
  protected textures: Map<string, Texture> = new Map();
  protected template: MaterialTemplate | null = null;
  
  // Material state
  protected dirty: boolean = true;
  protected compiled: boolean = false;
  
  // Performance tracking
  protected lastUsed: number = 0;
  protected useCount: number = 0;
  protected memoryUsage: number = 0;

  constructor(shaderManager: ShaderManager, config: MaterialConfig) {
    this.shaderManager = shaderManager;
    this.config = { ...config };
    
    // Initialize textures
    if (config.textures) {
      this.textures = new Map(config.textures);
    }
    
    this.calculateMemoryUsage();
  }

  public async initialize(): Promise<void> {
    await this.compileShader();
  }

  protected async compileShader(): Promise<void> {
    this.shader = this.shaderManager.getShader(this.config.shaderName);
    
    if (!this.shader) {
      throw new Error(`Shader not found: ${this.config.shaderName}`);
    }
    
    this.compiled = true;
    this.dirty = false;
  }

  public bind(targetShader?: ShaderProgram): void {
    const shaderToUse = targetShader || this.shader;
    if (!shaderToUse) {
      console.warn(`No shader available for material: ${this.config.name}`);
      return;
    }
    
    shaderToUse.use();
    
    // Bind uniforms
    this.bindUniforms(shaderToUse);
    
    // Bind textures
    this.bindTextures(shaderToUse);
    
    // Update usage statistics
    this.lastUsed = performance.now();
    this.useCount++;
  }

  protected bindUniforms(shader: ShaderProgram): void {
    for (const [name, uniform] of Object.entries(this.config.uniforms)) {
      if (shader.hasUniform(name)) {
        shader.setUniform(name, uniform.type, uniform.value);
      }
    }
  }

  protected bindTextures(shader: ShaderProgram): void {
    let textureUnit = 0;
    
    for (const [name, texture] of this.textures) {
      const uniformName = `u_${name}Texture`;
      
      if (shader.hasUniform(uniformName)) {
        texture.bind(textureUnit);
        shader.setUniform(uniformName, 'sampler2D', textureUnit);
        textureUnit++;
      }
    }
  }

  public unbind(): void {
    // Unbind textures
    for (let i = 0; i < this.textures.size; i++) {
      // Texture unbinding would be handled by the renderer
    }
  }

  // Uniform management
  public setUniform(name: string, type: UniformType, value: UniformValue): void {
    this.config.uniforms[name] = { type, value };
    this.dirty = true;
  }

  public getUniform(name: string): { type: UniformType; value: UniformValue } | null {
    return this.config.uniforms[name] || null;
  }

  public hasUniform(name: string): boolean {
    return name in this.config.uniforms;
  }

  // Texture management
  public setTexture(name: string, texture: Texture | null): void {
    if (texture) {
      this.textures.set(name, texture);
    } else {
      this.textures.delete(name);
    }
    
    this.calculateMemoryUsage();
    this.dirty = true;
  }

  public getTexture(name: string): Texture | null {
    return this.textures.get(name) || null;
  }

  public hasTexture(name: string): boolean {
    return this.textures.has(name);
  }

  public getAllTextures(): Map<string, Texture> {
    return new Map(this.textures);
  }

  // Material properties
  public getName(): string {
    return this.config.name;
  }

  public setName(name: string): void {
    this.config.name = name;
  }

  public getShaderName(): string {
    return this.config.shaderName;
  }

  public setShaderName(shaderName: string): void {
    this.config.shaderName = shaderName;
    this.shader = null;
    this.compiled = false;
    this.dirty = true;
  }

  public isTransparent(): boolean {
    return this.config.transparent || false;
  }

  public setTransparent(transparent: boolean): void {
    this.config.transparent = transparent;
    this.dirty = true;
  }

  public isDoubleSided(): boolean {
    return this.config.doubleSided || false;
  }

  public setDoubleSided(doubleSided: boolean): void {
    this.config.doubleSided = doubleSided;
    this.dirty = true;
  }

  public getBlending(): boolean {
    return this.config.blending || false;
  }

  public setBlending(blending: boolean): void {
    this.config.blending = blending;
    this.dirty = true;
  }

  public getAlphaTest(): number {
    return this.config.alphaTest || 0.0;
  }

  public setAlphaTest(alphaTest: number): void {
    this.config.alphaTest = alphaTest;
    this.dirty = true;
  }

  public getDepthWrite(): boolean {
    return this.config.depthWrite !== false;
  }

  public setDepthWrite(depthWrite: boolean): void {
    this.config.depthWrite = depthWrite;
    this.dirty = true;
  }

  public getDepthTest(): boolean {
    return this.config.depthTest !== false;
  }

  public setDepthTest(depthTest: boolean): void {
    this.config.depthTest = depthTest;
    this.dirty = true;
  }

  public getCullFace(): 'front' | 'back' | 'none' {
    return this.config.cullFace || 'back';
  }

  public setCullFace(cullFace: 'front' | 'back' | 'none'): void {
    this.config.cullFace = cullFace;
    this.dirty = true;
  }

  public getRenderOrder(): number {
    return this.config.renderOrder || 0;
  }

  public setRenderOrder(renderOrder: number): void {
    this.config.renderOrder = renderOrder;
    this.dirty = true;
  }

  // Template management
  public setTemplate(template: MaterialTemplate | null): void {
    this.template = template;
  }

  public getTemplate(): MaterialTemplate | null {
    return this.template;
  }

  // Global parameters
  public setGlobalParameter(name: string, value: number): void {
    // Override in derived classes for specific behavior
  }

  // State management
  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
  }

  public isCompiled(): boolean {
    return this.compiled;
  }

  public getShader(): ShaderProgram | null {
    return this.shader;
  }

  // Performance and memory
  public getLastUsed(): number {
    return this.lastUsed;
  }

  public getUseCount(): number {
    return this.useCount;
  }

  public getMemoryUsage(): number {
    return this.memoryUsage;
  }

  protected calculateMemoryUsage(): void {
    this.memoryUsage = 0;
    
    // Calculate texture memory usage
    for (const texture of this.textures.values()) {
      this.memoryUsage += texture.getMemoryUsage();
    }
    
    // Add uniform memory (approximate)
    this.memoryUsage += Object.keys(this.config.uniforms).length * 16; // 16 bytes per uniform average
  }

  // Serialization
  public serialize(): any {
    return {
      name: this.config.name,
      shaderName: this.config.shaderName,
      uniforms: this.config.uniforms,
      textures: Array.from(this.textures.entries()).map(([name, texture]) => ({
        name,
        texture: texture.serialize?.() || null
      })),
      blending: this.config.blending,
      doubleSided: this.config.doubleSided,
      transparent: this.config.transparent,
      alphaTest: this.config.alphaTest,
      depthWrite: this.config.depthWrite,
      depthTest: this.config.depthTest,
      cullFace: this.config.cullFace,
      renderOrder: this.config.renderOrder,
      template: this.template
    };
  }

  public static deserialize(data: any, shaderManager: ShaderManager): Material | null {
    // This would be implemented by derived classes
    return null;
  }

  // Utility methods
  public clone(newName: string): Material {
    const clonedConfig: MaterialConfig = {
      ...this.config,
      name: newName,
      uniforms: JSON.parse(JSON.stringify(this.config.uniforms))
    };
    
    // Clone textures map
    clonedConfig.textures = new Map(this.textures);
    
    const cloned = this.createInstance(clonedConfig);
    cloned.setTemplate(this.template);
    
    return cloned;
  }

  protected abstract createInstance(config: MaterialConfig): Material;

  public async preload(): Promise<void> {
    if (!this.compiled) {
      await this.compileShader();
    }
    
    // Preload textures if needed
    for (const texture of this.textures.values()) {
      // Texture preloading would be handled here
    }
  }

  public dispose(): void {
    this.cleanup();
  }

  public cleanup(): void {
    // Don't delete textures as they might be shared
    this.textures.clear();
    this.shader = null;
    this.compiled = false;
    this.dirty = true;
  }

  // Debug and validation
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.name) {
      errors.push('Material name is required');
    }
    
    if (!this.config.shaderName) {
      errors.push('Shader name is required');
    }
    
    if (!this.shader && this.compiled) {
      errors.push('Shader compilation failed');
    }
    
    // Validate required textures from template
    if (this.template) {
      for (const requiredTexture of this.template.requiredTextures) {
        if (!this.hasTexture(requiredTexture)) {
          errors.push(`Required texture missing: ${requiredTexture}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  public toString(): string {
    return `Material: ${this.config.name}
      Shader: ${this.config.shaderName}
      Uniforms: ${Object.keys(this.config.uniforms).length}
      Textures: ${this.textures.size}
      Transparent: ${this.isTransparent()}
      Memory: ${(this.memoryUsage / 1024).toFixed(1)}KB
      Use Count: ${this.useCount}`;
  }
}