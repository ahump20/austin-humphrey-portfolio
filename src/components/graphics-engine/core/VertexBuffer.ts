/**
 * Vertex Buffer Object
 * High-performance vertex data storage
 */

export class VertexBuffer {
  private gl: WebGL2RenderingContext;
  private buffer: WebGLBuffer;
  private data: Float32Array;
  private usage: number;
  private size: number;

  constructor(gl: WebGL2RenderingContext, data: Float32Array, usage: number = gl.STATIC_DRAW) {
    this.gl = gl;
    this.data = data;
    this.usage = usage;
    this.size = data.byteLength;
    
    this.buffer = gl.createBuffer()!;
    if (!this.buffer) {
      throw new Error('Failed to create vertex buffer');
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  public bind(): void {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
  }

  public unbind(): void {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
  }

  public updateData(data: Float32Array, offset: number = 0): void {
    this.bind();
    
    if (data.byteLength + offset > this.size) {
      // Reallocate buffer if new data is larger
      this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.usage);
      this.size = data.byteLength;
      this.data = data;
    } else {
      // Update existing buffer
      this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, data);
      if (offset === 0 && data.byteLength === this.size) {
        this.data = data;
      }
    }
    
    this.unbind();
  }

  public getData(): Float32Array {
    return this.data;
  }

  public getSize(): number {
    return this.size;
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