/**
 * Standard Material
 * Simplified material for better performance when PBR is not needed
 */

import { Material, MaterialConfig } from './Material';
import { ShaderManager } from '../shaders/ShaderManager';
import { Texture } from '../core/Texture';
import { vec3 } from 'gl-matrix';

export interface StandardConfig extends MaterialConfig {
  diffuse?: vec3;
  specular?: vec3;
  shininess?: number;
  emissive?: vec3;
  opacity?: number;
}

export class StandardMaterial extends Material {
  private diffuseMap: Texture | null = null;
  private specularMap: Texture | null = null;
  private normalMap: Texture | null = null;
  private emissiveMap: Texture | null = null;
  private opacityMap: Texture | null = null;

  constructor(shaderManager: ShaderManager, config: StandardConfig) {
    const standardConfig: MaterialConfig = {
      ...config,
      uniforms: {
        u_diffuse: { type: 'vec3', value: config.diffuse || [1.0, 1.0, 1.0] },
        u_specular: { type: 'vec3', value: config.specular || [1.0, 1.0, 1.0] },
        u_shininess: { type: 'float', value: config.shininess || 32.0 },
        u_emissive: { type: 'vec3', value: config.emissive || [0.0, 0.0, 0.0] },
        u_opacity: { type: 'float', value: config.opacity || 1.0 },
        ...config.uniforms
      }
    };
    
    super(shaderManager, standardConfig);
  }

  protected createInstance(config: MaterialConfig): Material {
    return new StandardMaterial(this.shaderManager, config as StandardConfig);
  }

  // Diffuse properties
  public setDiffuse(color: vec3): void {
    this.setUniform('u_diffuse', 'vec3', color);
  }

  public getDiffuse(): vec3 {
    const uniform = this.getUniform('u_diffuse');
    return uniform ? uniform.value as vec3 : [1, 1, 1];
  }

  public setDiffuseMap(texture: Texture | null): void {
    this.diffuseMap = texture;
    this.setTexture('diffuse', texture);
    this.setUniform('u_hasDiffuseMap', 'bool', texture !== null ? 1 : 0);
  }

  public getDiffuseMap(): Texture | null {
    return this.diffuseMap;
  }

  // Specular properties
  public setSpecular(color: vec3): void {
    this.setUniform('u_specular', 'vec3', color);
  }

  public getSpecular(): vec3 {
    const uniform = this.getUniform('u_specular');
    return uniform ? uniform.value as vec3 : [1, 1, 1];
  }

  public setShininess(shininess: number): void {
    this.setUniform('u_shininess', 'float', shininess);
  }

  public getShininess(): number {
    const uniform = this.getUniform('u_shininess');
    return uniform ? uniform.value as number : 32.0;
  }

  public setSpecularMap(texture: Texture | null): void {
    this.specularMap = texture;
    this.setTexture('specular', texture);
    this.setUniform('u_hasSpecularMap', 'bool', texture !== null ? 1 : 0);
  }

  public getSpecularMap(): Texture | null {
    return this.specularMap;
  }

  // Normal mapping
  public setNormalMap(texture: Texture | null): void {
    this.normalMap = texture;
    this.setTexture('normal', texture);
    this.setUniform('u_hasNormalMap', 'bool', texture !== null ? 1 : 0);
  }

  public getNormalMap(): Texture | null {
    return this.normalMap;
  }

  // Emissive properties
  public setEmissive(color: vec3): void {
    this.setUniform('u_emissive', 'vec3', color);
  }

  public getEmissive(): vec3 {
    const uniform = this.getUniform('u_emissive');
    return uniform ? uniform.value as vec3 : [0, 0, 0];
  }

  public setEmissiveMap(texture: Texture | null): void {
    this.emissiveMap = texture;
    this.setTexture('emissive', texture);
    this.setUniform('u_hasEmissiveMap', 'bool', texture !== null ? 1 : 0);
  }

  public getEmissiveMap(): Texture | null {
    return this.emissiveMap;
  }

  // Opacity
  public setOpacity(opacity: number): void {
    this.setUniform('u_opacity', 'float', opacity);
    this.setTransparent(opacity < 1.0);
  }

  public getOpacity(): number {
    const uniform = this.getUniform('u_opacity');
    return uniform ? uniform.value as number : 1.0;
  }

  public setOpacityMap(texture: Texture | null): void {
    this.opacityMap = texture;
    this.setTexture('opacity', texture);
    this.setUniform('u_hasOpacityMap', 'bool', texture !== null ? 1 : 0);
  }

  public getOpacityMap(): Texture | null {
    return this.opacityMap;
  }
}