/**
 * Advanced Mesh System
 * High-performance mesh with vertex attributes and optimizations
 */

import { VertexBuffer } from './VertexBuffer';
import { IndexBuffer } from './IndexBuffer';
import { vec3 } from 'gl-matrix';

export interface VertexAttribute {
  name: string;
  size: number;
  type: number;
  normalized: boolean;
  offset: number;
}

export interface MeshBounds {
  min: vec3;
  max: vec3;
  center: vec3;
  radius: number;
}

export class Mesh {
  private vertexBuffer: VertexBuffer;
  private indexBuffer: IndexBuffer;
  private vao: WebGLVertexArrayObject;
  private indexCount: number;
  private vertexCount: number;
  private attributes: Map<string, VertexAttribute> = new Map();
  private bounds: MeshBounds;
  
  private primitiveType: number = WebGL2RenderingContext.TRIANGLES;
  private instanceCount: number = 1;
  private instanceBuffer: VertexBuffer | null = null;
  
  constructor(
    vertexBuffer: VertexBuffer,
    indexBuffer: IndexBuffer,
    vao: WebGLVertexArrayObject,
    indexCount: number,
    vertexCount?: number
  ) {
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;
    this.vao = vao;
    this.indexCount = indexCount;
    this.vertexCount = vertexCount || 0;
    this.bounds = this.calculateBounds();
  }

  private calculateBounds(): MeshBounds {
    // Default bounds - would be calculated from vertex data in a real implementation
    const min = vec3.fromValues(-1, -1, -1);
    const max = vec3.fromValues(1, 1, 1);
    const center = vec3.create();
    vec3.add(center, min, max);
    vec3.scale(center, center, 0.5);
    
    const size = vec3.create();
    vec3.subtract(size, max, min);
    const radius = vec3.length(size) * 0.5;
    
    return { min, max, center, radius };
  }

  public getVertexBuffer(): VertexBuffer {
    return this.vertexBuffer;
  }

  public getIndexBuffer(): IndexBuffer {
    return this.indexBuffer;
  }

  public getVAO(): WebGLVertexArrayObject {
    return this.vao;
  }

  public getIndexCount(): number {
    return this.indexCount;
  }

  public getVertexCount(): number {
    return this.vertexCount;
  }

  public getPrimitiveType(): number {
    return this.primitiveType;
  }

  public setPrimitiveType(type: number): void {
    this.primitiveType = type;
  }

  public getInstanceCount(): number {
    return this.instanceCount;
  }

  public setInstanceCount(count: number): void {
    this.instanceCount = count;
  }

  public getInstanceBuffer(): VertexBuffer | null {
    return this.instanceBuffer;
  }

  public setInstanceBuffer(buffer: VertexBuffer | null): void {
    this.instanceBuffer = buffer;
  }

  public getBounds(): MeshBounds {
    return {
      min: vec3.clone(this.bounds.min),
      max: vec3.clone(this.bounds.max),
      center: vec3.clone(this.bounds.center),
      radius: this.bounds.radius
    };
  }

  public addAttribute(name: string, attribute: VertexAttribute): void {
    this.attributes.set(name, attribute);
  }

  public getAttribute(name: string): VertexAttribute | undefined {
    return this.attributes.get(name);
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public getAttributes(): Map<string, VertexAttribute> {
    return new Map(this.attributes);
  }

  public bind(): void {
    // VAO binding would be handled by renderer
  }

  public unbind(): void {
    // VAO unbinding would be handled by renderer
  }

  public cleanup(): void {
    this.vertexBuffer.cleanup();
    this.indexBuffer.cleanup();
    if (this.instanceBuffer) {
      this.instanceBuffer.cleanup();
    }
    // VAO cleanup would be handled by renderer
  }
}