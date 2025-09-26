/**
 * Index Buffer Object
 * High-performance index data storage
 */

export class IndexBuffer {
  private gl: WebGL2RenderingContext;
  private buffer: WebGLBuffer;
  private data: Uint16Array | Uint32Array;
  private usage: number;
  private size: number;
  private count: number;
  private type: number;

  constructor(gl: WebGL2RenderingContext, data: Uint16Array | Uint32Array, usage: number = gl.STATIC_DRAW) {
    this.gl = gl;
    this.data = data;
    this.usage = usage;
    this.size = data.byteLength;
    this.count = data.length;
    this.type = data instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    
    this.buffer = gl.createBuffer()!;
    if (!this.buffer) {
      throw new Error('Failed to create index buffer');
    }
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, usage);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  public bind(): void {
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer);
  }

  public unbind(): void {
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
  }

  public updateData(data: Uint16Array | Uint32Array, offset: number = 0): void {
    this.bind();
    
    if (data.byteLength + offset > this.size) {
      // Reallocate buffer if new data is larger
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, this.usage);
      this.size = data.byteLength;
      this.count = data.length;
      this.data = data;
      this.type = data instanceof Uint32Array ? this.gl.UNSIGNED_INT : this.gl.UNSIGNED_SHORT;
    } else {
      // Update existing buffer
      this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, offset, data);
      if (offset === 0 && data.byteLength === this.size) {
        this.data = data;
        this.count = data.length;
      }
    }
    
    this.unbind();
  }

  public getData(): Uint16Array | Uint32Array {
    return this.data;
  }

  public getSize(): number {
    return this.size;
  }

  public getCount(): number {
    return this.count;
  }

  public getType(): number {
    return this.type;
  }

  public getBuffer(): WebGLBuffer {
    return this.buffer;
  }

  public cleanup(): void {
    if (this.buffer) {
      this.gl.deleteBuffer(this.buffer);
    }
  }
}