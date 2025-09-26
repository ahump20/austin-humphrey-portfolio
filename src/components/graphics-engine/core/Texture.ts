/**
 * Advanced Texture System
 * High-performance texture management with multiple formats
 */

export interface TextureConfig {
  width: number;
  height: number;
  format: number;
  type: number;
  minFilter: number;
  magFilter: number;
  wrapS: number;
  wrapT: number;
  generateMipmaps: boolean;
  data?: ArrayBufferView | null;
  flipY?: boolean;
  premultiplyAlpha?: boolean;
}

export class Texture {
  private gl: WebGL2RenderingContext;
  private texture: WebGLTexture;
  private config: TextureConfig;
  private memoryUsage: number = 0;

  constructor(gl: WebGL2RenderingContext, config: TextureConfig) {
    this.gl = gl;
    this.config = { ...config };
    
    this.texture = gl.createTexture()!;
    if (!this.texture) {
      throw new Error('Failed to create texture');
    }
    
    this.initialize();
    this.calculateMemoryUsage();
  }

  private initialize(): void {
    const gl = this.gl;
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.config.minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.config.magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.config.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.config.wrapT);
    
    // Set pixel store parameters
    if (this.config.flipY !== undefined) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.config.flipY);
    }
    if (this.config.premultiplyAlpha !== undefined) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.config.premultiplyAlpha);
    }
    
    // Upload texture data
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.config.format,
      this.config.width,
      this.config.height,
      0,
      this.getBaseFormat(this.config.format),
      this.config.type,
      this.config.data || null
    );
    
    // Generate mipmaps if requested
    if (this.config.generateMipmaps && this.isPowerOfTwo()) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private getBaseFormat(internalFormat: number): number {
    const gl = this.gl;
    
    switch (internalFormat) {
      case gl.RGB:
      case gl.RGB8:
      case gl.RGB16F:
      case gl.RGB32F:
        return gl.RGB;
      case gl.RGBA:
      case gl.RGBA8:
      case gl.RGBA16F:
      case gl.RGBA32F:
        return gl.RGBA;
      case gl.DEPTH_COMPONENT:
      case gl.DEPTH_COMPONENT16:
      case gl.DEPTH_COMPONENT24:
      case gl.DEPTH_COMPONENT32F:
        return gl.DEPTH_COMPONENT;
      case gl.DEPTH_STENCIL:
      case gl.DEPTH24_STENCIL8:
        return gl.DEPTH_STENCIL;
      case gl.RED:
      case gl.R8:
      case gl.R16F:
      case gl.R32F:
        return gl.RED;
      case gl.RG:
      case gl.RG8:
      case gl.RG16F:
      case gl.RG32F:
        return gl.RG;
      default:
        return gl.RGBA;
    }
  }

  private isPowerOfTwo(): boolean {
    return (
      (this.config.width & (this.config.width - 1)) === 0 &&
      (this.config.height & (this.config.height - 1)) === 0
    );
  }

  private calculateMemoryUsage(): void {
    const bytesPerPixel = this.getBytesPerPixel();
    this.memoryUsage = this.config.width * this.config.height * bytesPerPixel;
    
    if (this.config.generateMipmaps && this.isPowerOfTwo()) {
      // Add mipmap memory usage (approximately 1/3 additional)
      this.memoryUsage *= 1.33;
    }
  }

  private getBytesPerPixel(): number {
    const gl = this.gl;
    
    let channels = 4; // Default RGBA
    switch (this.config.format) {
      case gl.RGB:
      case gl.RGB8:
        channels = 3;
        break;
      case gl.RG:
      case gl.RG8:
        channels = 2;
        break;
      case gl.RED:
      case gl.R8:
      case gl.DEPTH_COMPONENT:
        channels = 1;
        break;
    }
    
    let bytesPerChannel = 1; // Default 8-bit
    switch (this.config.type) {
      case gl.UNSIGNED_SHORT:
      case gl.HALF_FLOAT:
        bytesPerChannel = 2;
        break;
      case gl.FLOAT:
      case gl.UNSIGNED_INT:
        bytesPerChannel = 4;
        break;
    }
    
    return channels * bytesPerChannel;
  }

  public bind(unit: number = 0): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  }

  public unbind(): void {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  public updateData(data: ArrayBufferView, x: number = 0, y: number = 0, width?: number, height?: number): void {
    const gl = this.gl;
    
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      x,
      y,
      width || this.config.width,
      height || this.config.height,
      this.getBaseFormat(this.config.format),
      this.config.type,
      data
    );
    
    if (this.config.generateMipmaps && this.isPowerOfTwo()) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  public resize(width: number, height: number): void {
    if (this.config.width === width && this.config.height === height) {
      return;
    }
    
    this.config.width = width;
    this.config.height = height;
    
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.config.format,
      width,
      height,
      0,
      this.getBaseFormat(this.config.format),
      this.config.type,
      null
    );
    
    if (this.config.generateMipmaps && this.isPowerOfTwo()) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.calculateMemoryUsage();
  }

  public generateMipmaps(): void {
    if (!this.isPowerOfTwo()) {
      console.warn('Cannot generate mipmaps for non-power-of-two texture');
      return;
    }
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    
    this.config.generateMipmaps = true;
    this.calculateMemoryUsage();
  }

  public setFiltering(minFilter: number, magFilter: number): void {
    this.config.minFilter = minFilter;
    this.config.magFilter = magFilter;
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, minFilter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, magFilter);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  public setWrapping(wrapS: number, wrapT: number): void {
    this.config.wrapS = wrapS;
    this.config.wrapT = wrapT;
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, wrapS);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, wrapT);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  public getTexture(): WebGLTexture {
    return this.texture;
  }

  public getWidth(): number {
    return this.config.width;
  }

  public getHeight(): number {
    return this.config.height;
  }

  public getFormat(): number {
    return this.config.format;
  }

  public getType(): number {
    return this.config.type;
  }

  public getMemoryUsage(): number {
    return this.memoryUsage;
  }

  public getConfig(): TextureConfig {
    return { ...this.config };
  }

  public static createFromImage(gl: WebGL2RenderingContext, image: HTMLImageElement, config?: Partial<TextureConfig>): Texture {
    const defaultConfig: TextureConfig = {
      width: image.width,
      height: image.height,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      minFilter: gl.LINEAR_MIPMAP_LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.REPEAT,
      wrapT: gl.REPEAT,
      generateMipmaps: true,
      flipY: true,
      premultiplyAlpha: false
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    const texture = new Texture(gl, finalConfig);
    
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, finalConfig.format, finalConfig.format, finalConfig.type, image);
    
    if (finalConfig.generateMipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    return texture;
  }

  public static createFromCanvas(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, config?: Partial<TextureConfig>): Texture {
    const defaultConfig: TextureConfig = {
      width: canvas.width,
      height: canvas.height,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      generateMipmaps: false,
      flipY: true,
      premultiplyAlpha: false
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    const texture = new Texture(gl, finalConfig);
    
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, finalConfig.format, finalConfig.format, finalConfig.type, canvas);
    
    if (finalConfig.generateMipmaps && texture.isPowerOfTwo()) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    return texture;
  }

  public cleanup(): void {
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
    }
  }
}