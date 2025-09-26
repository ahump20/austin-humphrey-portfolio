/**
 * Shader Program Class
 * Manages WebGL program and uniform/attribute locations
 */

import { Shader } from './Shader';
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';

export type UniformValue = 
  | number 
  | number[] 
  | Float32Array 
  | Int32Array 
  | Uint32Array 
  | vec2 
  | vec3 
  | vec4 
  | mat4;

export type UniformType = 
  | 'float' 
  | 'int' 
  | 'bool' 
  | 'vec2' 
  | 'vec3' 
  | 'vec4' 
  | 'ivec2' 
  | 'ivec3' 
  | 'ivec4' 
  | 'bvec2' 
  | 'bvec3' 
  | 'bvec4' 
  | 'mat2' 
  | 'mat3' 
  | 'mat4' 
  | 'sampler2D' 
  | 'samplerCube';

export interface UniformInfo {
  location: WebGLUniformLocation;
  type: number;
  size: number;
  name: string;
}

export interface AttributeInfo {
  location: number;
  type: number;
  size: number;
  name: string;
}

export class ShaderProgram {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private shader: Shader;
  
  private uniforms: Map<string, UniformInfo> = new Map();
  private attributes: Map<string, AttributeInfo> = new Map();
  
  // Uniform cache to avoid redundant GL calls
  private uniformCache: Map<string, any> = new Map();
  private uniformDirty = new Set<string>();
  
  // Performance tracking
  private stats = {
    uniformUpdates: 0,
    redundantCalls: 0,
    binds: 0
  };

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram, shader: Shader) {
    this.gl = gl;
    this.program = program;
    this.shader = shader;
    
    this.introspectProgram();
  }

  private introspectProgram(): void {
    const gl = this.gl;
    
    // Get active uniforms
    const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = gl.getActiveUniform(this.program, i);
      if (!uniformInfo) continue;
      
      const location = gl.getUniformLocation(this.program, uniformInfo.name);
      if (!location) continue;
      
      // Handle array uniforms (remove [0] suffix)
      const name = uniformInfo.name.replace(/\[0\]$/, '');
      
      this.uniforms.set(name, {
        location,
        type: uniformInfo.type,
        size: uniformInfo.size,
        name: uniformInfo.name
      });
    }
    
    // Get active attributes
    const attributeCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributeCount; i++) {
      const attributeInfo = gl.getActiveAttrib(this.program, i);
      if (!attributeInfo) continue;
      
      const location = gl.getAttribLocation(this.program, attributeInfo.name);
      if (location === -1) continue;
      
      this.attributes.set(attributeInfo.name, {
        location,
        type: attributeInfo.type,
        size: attributeInfo.size,
        name: attributeInfo.name
      });
    }
  }

  public use(): void {
    this.gl.useProgram(this.program);
    this.stats.binds++;
    
    // Apply any dirty uniforms
    this.flushUniforms();
  }

  private flushUniforms(): void {
    for (const uniformName of this.uniformDirty) {
      const cachedValue = this.uniformCache.get(uniformName);
      if (cachedValue !== undefined) {
        this.setUniformDirect(uniformName, cachedValue.type, cachedValue.value);
      }
    }
    this.uniformDirty.clear();
  }

  public setUniform(name: string, type: UniformType, value: UniformValue): void {
    // Check if value has changed
    const cached = this.uniformCache.get(name);
    if (cached && this.valuesEqual(cached.value, value)) {
      this.stats.redundantCalls++;
      return; // Value hasn't changed
    }
    
    // Cache the value
    this.uniformCache.set(name, { type, value: this.cloneValue(value) });
    this.uniformDirty.add(name);
    
    // If program is currently bound, set immediately
    if (this.gl.getParameter(this.gl.CURRENT_PROGRAM) === this.program) {
      this.setUniformDirect(name, type, value);
      this.uniformDirty.delete(name);
    }
  }

  private setUniformDirect(name: string, type: UniformType, value: UniformValue): void {
    const uniformInfo = this.uniforms.get(name);
    if (!uniformInfo) {
      console.warn(`Uniform not found: ${name}`);
      return;
    }
    
    const gl = this.gl;
    const location = uniformInfo.location;
    
    try {
      switch (type) {
        case 'float':
          gl.uniform1f(location, value as number);
          break;
        case 'int':
        case 'bool':
        case 'sampler2D':
        case 'samplerCube':
          gl.uniform1i(location, value as number);
          break;
        case 'vec2':
          if (Array.isArray(value)) {
            gl.uniform2fv(location, value);
          } else {
            const v = value as vec2;
            gl.uniform2f(location, v[0], v[1]);
          }
          break;
        case 'vec3':
          if (Array.isArray(value)) {
            gl.uniform3fv(location, value);
          } else {
            const v = value as vec3;
            gl.uniform3f(location, v[0], v[1], v[2]);
          }
          break;
        case 'vec4':
          if (Array.isArray(value)) {
            gl.uniform4fv(location, value);
          } else {
            const v = value as vec4;
            gl.uniform4f(location, v[0], v[1], v[2], v[3]);
          }
          break;
        case 'ivec2':
          if (Array.isArray(value)) {
            gl.uniform2iv(location, value);
          } else {
            const v = value as vec2;
            gl.uniform2i(location, v[0], v[1]);
          }
          break;
        case 'ivec3':
          if (Array.isArray(value)) {
            gl.uniform3iv(location, value);
          } else {
            const v = value as vec3;
            gl.uniform3i(location, v[0], v[1], v[2]);
          }
          break;
        case 'ivec4':
          if (Array.isArray(value)) {
            gl.uniform4iv(location, value);
          } else {
            const v = value as vec4;
            gl.uniform4i(location, v[0], v[1], v[2], v[3]);
          }
          break;
        case 'mat2':
          gl.uniformMatrix2fv(location, false, value as Float32Array);
          break;
        case 'mat3':
          gl.uniformMatrix3fv(location, false, value as Float32Array);
          break;
        case 'mat4':
          gl.uniformMatrix4fv(location, false, value as Float32Array);
          break;
        default:
          console.warn(`Unsupported uniform type: ${type}`);
      }
      
      this.stats.uniformUpdates++;
      
    } catch (error) {
      console.error(`Failed to set uniform ${name} of type ${type}:`, error);
    }
  }

  public setUniforms(uniforms: Record<string, { type: UniformType; value: UniformValue }>): void {
    for (const [name, uniform] of Object.entries(uniforms)) {
      this.setUniform(name, uniform.type, uniform.value);
    }
  }

  public hasUniform(name: string): boolean {
    return this.uniforms.has(name);
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public getUniformLocation(name: string): WebGLUniformLocation | null {
    const uniformInfo = this.uniforms.get(name);
    return uniformInfo ? uniformInfo.location : null;
  }

  public getAttributeLocation(name: string): number {
    const attributeInfo = this.attributes.get(name);
    return attributeInfo ? attributeInfo.location : -1;
  }

  public getUniformInfo(name: string): UniformInfo | null {
    return this.uniforms.get(name) || null;
  }

  public getAttributeInfo(name: string): AttributeInfo | null {
    return this.attributes.get(name) || null;
  }

  public getAllUniforms(): Map<string, UniformInfo> {
    return new Map(this.uniforms);
  }

  public getAllAttributes(): Map<string, AttributeInfo> {
    return new Map(this.attributes);
  }

  public getUniformNames(): string[] {
    return Array.from(this.uniforms.keys());
  }

  public getAttributeNames(): string[] {
    return Array.from(this.attributes.keys());
  }

  private valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
    
    if (a instanceof Float32Array && b instanceof Float32Array) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (Math.abs(a[i] - b[i]) > 1e-6) return false;
      }
      return true;
    }
    
    return false;
  }

  private cloneValue(value: any): any {
    if (Array.isArray(value)) {
      return [...value];
    }
    if (value instanceof Float32Array) {
      return new Float32Array(value);
    }
    if (value instanceof Int32Array) {
      return new Int32Array(value);
    }
    if (value instanceof Uint32Array) {
      return new Uint32Array(value);
    }
    return value;
  }

  public clearCache(): void {
    this.uniformCache.clear();
    this.uniformDirty.clear();
  }

  public getProgram(): WebGLProgram {
    return this.program;
  }

  public getShader(): Shader {
    return this.shader;
  }

  public isValid(): boolean {
    return this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS);
  }

  public getInfoLog(): string | null {
    return this.gl.getProgramInfoLog(this.program);
  }

  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats.uniformUpdates = 0;
    this.stats.redundantCalls = 0;
    this.stats.binds = 0;
  }

  // Debugging and validation
  public validate(): boolean {
    this.gl.validateProgram(this.program);
    return this.gl.getProgramParameter(this.program, this.gl.VALIDATE_STATUS);
  }

  public getActiveUniforms(): { name: string; type: string; size: number }[] {
    const result = [];
    for (const [name, info] of this.uniforms) {
      result.push({
        name,
        type: this.getTypeName(info.type),
        size: info.size
      });
    }
    return result;
  }

  public getActiveAttributes(): { name: string; type: string; size: number }[] {
    const result = [];
    for (const [name, info] of this.attributes) {
      result.push({
        name,
        type: this.getTypeName(info.type),
        size: info.size
      });
    }
    return result;
  }

  private getTypeName(glType: number): string {
    const gl = this.gl;
    switch (glType) {
      case gl.FLOAT: return 'float';
      case gl.FLOAT_VEC2: return 'vec2';
      case gl.FLOAT_VEC3: return 'vec3';
      case gl.FLOAT_VEC4: return 'vec4';
      case gl.INT: return 'int';
      case gl.INT_VEC2: return 'ivec2';
      case gl.INT_VEC3: return 'ivec3';
      case gl.INT_VEC4: return 'ivec4';
      case gl.BOOL: return 'bool';
      case gl.BOOL_VEC2: return 'bvec2';
      case gl.BOOL_VEC3: return 'bvec3';
      case gl.BOOL_VEC4: return 'bvec4';
      case gl.FLOAT_MAT2: return 'mat2';
      case gl.FLOAT_MAT3: return 'mat3';
      case gl.FLOAT_MAT4: return 'mat4';
      case gl.SAMPLER_2D: return 'sampler2D';
      case gl.SAMPLER_CUBE: return 'samplerCube';
      default: return `unknown(${glType})`;
    }
  }

  public toString(): string {
    return `ShaderProgram: ${this.shader.getName()}
      Uniforms: ${this.uniforms.size}
      Attributes: ${this.attributes.size}
      Stats: ${JSON.stringify(this.stats)}
      Valid: ${this.isValid()}`;
  }

  public cleanup(): void {
    this.clearCache();
    
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
    
    this.uniforms.clear();
    this.attributes.clear();
  }
}