/**
 * Shader Class
 * Represents a shader with its source code and metadata
 */

import { ShaderSource } from './ShaderManager';

export interface ShaderMetadata {
  name: string;
  version: string;
  author?: string;
  description?: string;
  tags?: string[];
  uniforms?: Record<string, {
    type: string;
    description?: string;
    default?: any;
  }>;
  attributes?: Record<string, {
    type: string;
    description?: string;
  }>;
}

export class Shader {
  private name: string;
  private source: ShaderSource;
  private metadata: ShaderMetadata;
  private dependencies: string[] = [];
  private variants: Map<string, ShaderSource> = new Map();
  
  // Shader analysis results
  private uniforms: Map<string, {
    type: string;
    location?: number;
    size?: number;
  }> = new Map();
  
  private attributes: Map<string, {
    type: string;
    location?: number;
    size?: number;
  }> = new Map();
  
  private varyings: Map<string, {
    type: string;
  }> = new Map();

  constructor(name: string, source: ShaderSource, metadata?: Partial<ShaderMetadata>) {
    this.name = name;
    this.source = { ...source };
    this.metadata = {
      name,
      version: '1.0.0',
      uniforms: {},
      attributes: {},
      ...metadata
    };
    
    this.analyzeShader();
  }

  private analyzeShader(): void {
    this.extractUniforms();
    this.extractAttributes();
    this.extractVaryings();
    this.extractDependencies();
  }

  private extractUniforms(): void {
    const uniformRegex = /uniform\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]*\])?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\[([^\]]*)\])?\s*;/g;
    
    const sources = [this.source.vertex, this.source.fragment, this.source.geometry].filter(Boolean);
    
    for (const source of sources) {
      let match;
      while ((match = uniformRegex.exec(source)) !== null) {
        const type = match[1];
        const name = match[2];
        const arraySize = match[3];
        
        this.uniforms.set(name, {
          type: type,
          size: arraySize ? parseInt(arraySize) || 1 : 1
        });
      }
    }
  }

  private extractAttributes(): void {
    const attributeRegex = /(?:attribute|in)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/g;
    
    if (this.source.vertex) {
      let match;
      while ((match = attributeRegex.exec(this.source.vertex)) !== null) {
        const type = match[1];
        const name = match[2];
        
        this.attributes.set(name, { type });
      }
    }
  }

  private extractVaryings(): void {
    const varyingRegex = /(?:varying|out|in)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/g;
    
    const sources = [this.source.vertex, this.source.fragment, this.source.geometry].filter(Boolean);
    
    for (const source of sources) {
      let match;
      while ((match = varyingRegex.exec(source)) !== null) {
        const type = match[1];
        const name = match[2];
        
        this.varyings.set(name, { type });
      }
    }
  }

  private extractDependencies(): void {
    const includeRegex = /#include\s+"([^"]+)"/g;
    const dependencies = new Set<string>();
    
    const sources = [this.source.vertex, this.source.fragment, this.source.geometry].filter(Boolean);
    
    for (const source of sources) {
      let match;
      while ((match = includeRegex.exec(source)) !== null) {
        dependencies.add(match[1]);
      }
    }
    
    this.dependencies = Array.from(dependencies);
  }

  public getName(): string {
    return this.name;
  }

  public getSource(): ShaderSource {
    return { ...this.source };
  }

  public getMetadata(): ShaderMetadata {
    return { ...this.metadata };
  }

  public getUniforms(): Map<string, { type: string; location?: number; size?: number }> {
    return new Map(this.uniforms);
  }

  public getAttributes(): Map<string, { type: string; location?: number; size?: number }> {
    return new Map(this.attributes);
  }

  public getVaryings(): Map<string, { type: string }> {
    return new Map(this.varyings);
  }

  public getDependencies(): string[] {
    return [...this.dependencies];
  }

  public hasUniform(name: string): boolean {
    return this.uniforms.has(name);
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public getUniformType(name: string): string | null {
    const uniform = this.uniforms.get(name);
    return uniform ? uniform.type : null;
  }

  public getAttributeType(name: string): string | null {
    const attribute = this.attributes.get(name);
    return attribute ? attribute.type : null;
  }

  public addVariant(name: string, source: ShaderSource): void {
    this.variants.set(name, { ...source });
  }

  public getVariant(name: string): ShaderSource | null {
    return this.variants.get(name) || null;
  }

  public getVariantNames(): string[] {
    return Array.from(this.variants.keys());
  }

  public setMetadata(metadata: Partial<ShaderMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  public updateSource(source: Partial<ShaderSource>): void {
    this.source = { ...this.source, ...source };
    this.analyzeShader(); // Re-analyze after update
  }

  public clone(newName: string): Shader {
    return new Shader(newName, this.source, this.metadata);
  }

  public serialize(): any {
    return {
      name: this.name,
      source: this.source,
      metadata: this.metadata,
      variants: Object.fromEntries(this.variants),
      uniforms: Object.fromEntries(this.uniforms),
      attributes: Object.fromEntries(this.attributes),
      varyings: Object.fromEntries(this.varyings),
      dependencies: this.dependencies
    };
  }

  public static deserialize(data: any): Shader {
    const shader = new Shader(data.name, data.source, data.metadata);
    
    // Restore variants
    if (data.variants) {
      for (const [name, source] of Object.entries(data.variants)) {
        shader.addVariant(name, source as ShaderSource);
      }
    }
    
    return shader;
  }

  public toString(): string {
    return `Shader: ${this.name}
      Version: ${this.metadata.version}
      Uniforms: ${this.uniforms.size}
      Attributes: ${this.attributes.size}
      Varyings: ${this.varyings.size}
      Dependencies: ${this.dependencies.length}
      Variants: ${this.variants.size}`;
  }
}