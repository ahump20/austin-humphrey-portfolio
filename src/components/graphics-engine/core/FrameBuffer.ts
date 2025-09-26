/**
 * FrameBuffer Object
 * Advanced framebuffer for render-to-texture operations
 */

import { Texture } from './Texture';

export interface FrameBufferConfig {
  width: number;
  height: number;
  colorAttachments: number;
  hasDepth: boolean;
  hasStencil: boolean;
  colorFormat: number;
  depthFormat: number;
  multisampled: boolean;
  samples: number;
}

export class FrameBuffer {
  private gl: WebGL2RenderingContext;
  private framebuffer: WebGLFramebuffer;
  private colorTextures: Texture[] = [];
  private depthTexture: Texture | null = null;
  private depthRenderbuffer: WebGLRenderbuffer | null = null;
  private config: FrameBufferConfig;
  
  private isComplete: boolean = false;

  constructor(gl: WebGL2RenderingContext, config: FrameBufferConfig) {
    this.gl = gl;
    this.config = { ...config };
    
    this.framebuffer = gl.createFramebuffer()!;
    if (!this.framebuffer) {
      throw new Error('Failed to create framebuffer');
    }
    
    this.initialize();
  }

  private initialize(): void {
    const gl = this.gl;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
    // Create color attachments
    for (let i = 0; i < this.config.colorAttachments; i++) {
      const colorTexture = new Texture(gl, {
        width: this.config.width,
        height: this.config.height,
        format: this.config.colorFormat,
        type: gl.UNSIGNED_BYTE,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        generateMipmaps: false
      });
      
      this.colorTextures.push(colorTexture);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + i,
        gl.TEXTURE_2D,
        colorTexture.getTexture(),
        0
      );
    }
    
    // Create depth attachment
    if (this.config.hasDepth) {
      if (this.config.multisampled) {
        this.depthRenderbuffer = gl.createRenderbuffer()!;
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRenderbuffer);
        gl.renderbufferStorageMultisample(
          gl.RENDERBUFFER,
          this.config.samples,
          this.config.depthFormat,
          this.config.width,
          this.config.height
        );
        gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          this.config.hasStencil ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT,
          gl.RENDERBUFFER,
          this.depthRenderbuffer
        );
      } else {
        this.depthTexture = new Texture(gl, {
          width: this.config.width,
          height: this.config.height,
          format: this.config.hasStencil ? gl.DEPTH_STENCIL : gl.DEPTH_COMPONENT,
          type: this.config.hasStencil ? gl.UNSIGNED_INT_24_8 : gl.UNSIGNED_INT,
          minFilter: gl.NEAREST,
          magFilter: gl.NEAREST,
          wrapS: gl.CLAMP_TO_EDGE,
          wrapT: gl.CLAMP_TO_EDGE,
          generateMipmaps: false
        });
        
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          this.config.hasStencil ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT,
          gl.TEXTURE_2D,
          this.depthTexture.getTexture(),
          0
        );
      }
    }
    
    // Setup draw buffers
    if (this.config.colorAttachments > 1) {
      const drawBuffers = [];
      for (let i = 0; i < this.config.colorAttachments; i++) {
        drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
      }
      gl.drawBuffers(drawBuffers);
    }
    
    // Check completeness
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    this.isComplete = status === gl.FRAMEBUFFER_COMPLETE;
    
    if (!this.isComplete) {
      console.error('Framebuffer is not complete:', this.getStatusString(status));
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private getStatusString(status: number): string {
    const gl = this.gl;
    switch (status) {
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        return 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT';
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        return 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT';
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        return 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS';
      case gl.FRAMEBUFFER_UNSUPPORTED:
        return 'FRAMEBUFFER_UNSUPPORTED';
      case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
        return 'FRAMEBUFFER_INCOMPLETE_MULTISAMPLE';
      default:
        return `Unknown status: ${status}`;
    }
  }

  public bind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, this.config.width, this.config.height);
  }

  public unbind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  public clear(color: [number, number, number, number] = [0, 0, 0, 1], depth: number = 1.0, stencil: number = 0): void {
    const gl = this.gl;
    
    this.bind();
    
    gl.clearColor(color[0], color[1], color[2], color[3]);
    gl.clearDepth(depth);
    gl.clearStencil(stencil);
    
    let mask = gl.COLOR_BUFFER_BIT;
    if (this.config.hasDepth) mask |= gl.DEPTH_BUFFER_BIT;
    if (this.config.hasStencil) mask |= gl.STENCIL_BUFFER_BIT;
    
    gl.clear(mask);
  }

  public resize(width: number, height: number): void {
    if (this.config.width === width && this.config.height === height) {
      return;
    }
    
    this.config.width = width;
    this.config.height = height;
    
    // Resize color textures
    for (const texture of this.colorTextures) {
      texture.resize(width, height);
    }
    
    // Resize depth texture/renderbuffer
    if (this.depthTexture) {
      this.depthTexture.resize(width, height);
    }
    
    if (this.depthRenderbuffer) {
      const gl = this.gl;
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRenderbuffer);
      if (this.config.multisampled) {
        gl.renderbufferStorageMultisample(
          gl.RENDERBUFFER,
          this.config.samples,
          this.config.depthFormat,
          width,
          height
        );
      } else {
        gl.renderbufferStorage(gl.RENDERBUFFER, this.config.depthFormat, width, height);
      }
    }
  }

  public getFramebuffer(): WebGLFramebuffer {
    return this.framebuffer;
  }

  public getColorTexture(index: number = 0): Texture | null {
    return this.colorTextures[index] || null;
  }

  public getColorTextures(): Texture[] {
    return [...this.colorTextures];
  }

  public getDepthTexture(): Texture | null {
    return this.depthTexture;
  }

  public getWidth(): number {
    return this.config.width;
  }

  public getHeight(): number {
    return this.config.height;
  }

  public isFramebufferComplete(): boolean {
    return this.isComplete;
  }

  public getConfig(): FrameBufferConfig {
    return { ...this.config };
  }
  
  public cleanup(): void {
    if (this.framebuffer) {
      this.gl.deleteFramebuffer(this.framebuffer);
    }
    
    for (const texture of this.colorTextures) {
      texture.cleanup();
    }
    
    if (this.depthTexture) {
      this.depthTexture.cleanup();
    }
    
    if (this.depthRenderbuffer) {
      this.gl.deleteRenderbuffer(this.depthRenderbuffer);
    }
  }
}