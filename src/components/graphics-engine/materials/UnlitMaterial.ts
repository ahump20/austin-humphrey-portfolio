/**
 * Unlit Material
 * Simple material without lighting calculations for UI, effects, etc.
 */

import { Material, MaterialConfig } from './Material';
import { ShaderManager } from '../shaders/ShaderManager';
import { Texture } from '../core/Texture';
import { vec3 } from 'gl-matrix';

export interface UnlitConfig extends MaterialConfig {
  color?: vec3;
  opacity?: number;
}

export class UnlitMaterial extends Material {
  private colorMap: Texture | null = null;

  constructor(shaderManager: ShaderManager, config: UnlitConfig) {
    const unlitConfig: MaterialConfig = {
      ...config,
      shaderName: config.shaderName || 'unlit',
      uniforms: {
        u_color: { type: 'vec3', value: config.color || [1.0, 1.0, 1.0] },
        u_opacity: { type: 'float', value: config.opacity || 1.0 },
        ...config.uniforms
      }
    };
    
    super(shaderManager, unlitConfig);
  }

  protected createInstance(config: MaterialConfig): Material {
    return new UnlitMaterial(this.shaderManager, config as UnlitConfig);
  }

  public setColor(color: vec3): void {
    this.setUniform('u_color', 'vec3', color);
  }

  public getColor(): vec3 {
    const uniform = this.getUniform('u_color');
    return uniform ? uniform.value as vec3 : [1, 1, 1];
  }

  public setColorMap(texture: Texture | null): void {
    this.colorMap = texture;
    this.setTexture('color', texture);
    this.setUniform('u_hasColorMap', 'bool', texture !== null ? 1 : 0);
  }

  public getColorMap(): Texture | null {
    return this.colorMap;
  }

  public setOpacity(opacity: number): void {
    this.setUniform('u_opacity', 'float', opacity);
    this.setTransparent(opacity < 1.0);
  }

  public getOpacity(): number {
    const uniform = this.getUniform('u_opacity');
    return uniform ? uniform.value as number : 1.0;
  }
}