/**
 * Water Material
 * Advanced water material with waves, foam, and reflections
 */

import { Material, MaterialConfig } from './Material';
import { ShaderManager } from '../shaders/ShaderManager';
import { Texture } from '../core/Texture';
import { vec3 } from 'gl-matrix';

export interface WaterConfig extends MaterialConfig {
  waterColor?: vec3;
  deepWaterColor?: vec3;
  foamColor?: vec3;
  waveAmplitude?: number;
  waveFrequency?: number;
  waveSpeed?: number;
  foamAmount?: number;
  transparency?: number;
  refractionStrength?: number;
  reflectionStrength?: number;
}

export class WaterMaterial extends Material {
  private normalMaps: Texture[] = [];
  private foamTexture: Texture | null = null;
  private depthTexture: Texture | null = null;
  private reflectionTexture: Texture | null = null;
  private refractionTexture: Texture | null = null;
  
  private animationTime: number = 0;

  constructor(shaderManager: ShaderManager, config: WaterConfig) {
    const waterConfig: MaterialConfig = {
      ...config,
      shaderName: config.shaderName || 'water',
      transparent: true,
      uniforms: {
        u_waterColor: { type: 'vec3', value: config.waterColor || [0.0, 0.4, 0.8] },
        u_deepWaterColor: { type: 'vec3', value: config.deepWaterColor || [0.0, 0.1, 0.4] },
        u_foamColor: { type: 'vec3', value: config.foamColor || [1.0, 1.0, 1.0] },
        u_waveAmplitude: { type: 'float', value: config.waveAmplitude || 0.1 },
        u_waveFrequency: { type: 'float', value: config.waveFrequency || 2.0 },
        u_waveSpeed: { type: 'float', value: config.waveSpeed || 1.0 },
        u_foamAmount: { type: 'float', value: config.foamAmount || 0.3 },
        u_transparency: { type: 'float', value: config.transparency || 0.8 },
        u_refractionStrength: { type: 'float', value: config.refractionStrength || 0.02 },
        u_reflectionStrength: { type: 'float', value: config.reflectionStrength || 0.5 },
        u_time: { type: 'float', value: 0.0 },
        u_shallowDepth: { type: 'float', value: 2.0 },
        u_deepDepth: { type: 'float', value: 10.0 },
        ...config.uniforms
      }
    };
    
    super(shaderManager, waterConfig);
  }

  protected createInstance(config: MaterialConfig): Material {
    return new WaterMaterial(this.shaderManager, config as WaterConfig);
  }

  public update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.setUniform('u_time', 'float', this.animationTime);
  }

  // Water colors
  public setWaterColor(color: vec3): void {
    this.setUniform('u_waterColor', 'vec3', color);
  }

  public getWaterColor(): vec3 {
    const uniform = this.getUniform('u_waterColor');
    return uniform ? uniform.value as vec3 : [0, 0.4, 0.8];
  }

  public setDeepWaterColor(color: vec3): void {
    this.setUniform('u_deepWaterColor', 'vec3', color);
  }

  public getDeepWaterColor(): vec3 {
    const uniform = this.getUniform('u_deepWaterColor');
    return uniform ? uniform.value as vec3 : [0, 0.1, 0.4];
  }

  public setFoamColor(color: vec3): void {
    this.setUniform('u_foamColor', 'vec3', color);
  }

  public getFoamColor(): vec3 {
    const uniform = this.getUniform('u_foamColor');
    return uniform ? uniform.value as vec3 : [1, 1, 1];
  }

  // Wave properties
  public setWaveAmplitude(amplitude: number): void {
    this.setUniform('u_waveAmplitude', 'float', amplitude);
  }

  public getWaveAmplitude(): number {
    const uniform = this.getUniform('u_waveAmplitude');
    return uniform ? uniform.value as number : 0.1;
  }

  public setWaveFrequency(frequency: number): void {
    this.setUniform('u_waveFrequency', 'float', frequency);
  }

  public getWaveFrequency(): number {
    const uniform = this.getUniform('u_waveFrequency');
    return uniform ? uniform.value as number : 2.0;
  }

  public setWaveSpeed(speed: number): void {
    this.setUniform('u_waveSpeed', 'float', speed);
  }

  public getWaveSpeed(): number {
    const uniform = this.getUniform('u_waveSpeed');
    return uniform ? uniform.value as number : 1.0;
  }

  // Normal maps for wave detail
  public addNormalMap(texture: Texture): void {
    const index = this.normalMaps.length;
    this.normalMaps.push(texture);
    this.setTexture(`normal${index}`, texture);
    this.setUniform(`u_hasNormal${index}Map`, 'bool', 1);
  }

  public setNormalMap(index: number, texture: Texture | null): void {
    if (index < this.normalMaps.length) {
      if (texture) {
        this.normalMaps[index] = texture;
        this.setTexture(`normal${index}`, texture);
        this.setUniform(`u_hasNormal${index}Map`, 'bool', 1);
      } else {
        this.normalMaps.splice(index, 1);
        this.setTexture(`normal${index}`, null);
        this.setUniform(`u_hasNormal${index}Map`, 'bool', 0);
      }
    }
  }

  public getNormalMap(index: number): Texture | null {
    return this.normalMaps[index] || null;
  }

  // Foam
  public setFoamTexture(texture: Texture | null): void {
    this.foamTexture = texture;
    this.setTexture('foam', texture);
    this.setUniform('u_hasFoamTexture', 'bool', texture !== null ? 1 : 0);
  }

  public getFoamTexture(): Texture | null {
    return this.foamTexture;
  }

  public setFoamAmount(amount: number): void {
    this.setUniform('u_foamAmount', 'float', amount);
  }

  public getFoamAmount(): number {
    const uniform = this.getUniform('u_foamAmount');
    return uniform ? uniform.value as number : 0.3;
  }

  // Depth and transparency
  public setDepthTexture(texture: Texture | null): void {
    this.depthTexture = texture;
    this.setTexture('depth', texture);
    this.setUniform('u_hasDepthTexture', 'bool', texture !== null ? 1 : 0);
  }

  public getDepthTexture(): Texture | null {
    return this.depthTexture;
  }

  public setTransparency(transparency: number): void {
    this.setUniform('u_transparency', 'float', transparency);
  }

  public getTransparency(): number {
    const uniform = this.getUniform('u_transparency');
    return uniform ? uniform.value as number : 0.8;
  }

  public setShallowDepth(depth: number): void {
    this.setUniform('u_shallowDepth', 'float', depth);
  }

  public setDeepDepth(depth: number): void {
    this.setUniform('u_deepDepth', 'float', depth);
  }

  // Reflection and refraction
  public setReflectionTexture(texture: Texture | null): void {
    this.reflectionTexture = texture;
    this.setTexture('reflection', texture);
    this.setUniform('u_hasReflectionTexture', 'bool', texture !== null ? 1 : 0);
  }

  public getReflectionTexture(): Texture | null {
    return this.reflectionTexture;
  }

  public setRefractionTexture(texture: Texture | null): void {
    this.refractionTexture = texture;
    this.setTexture('refraction', texture);
    this.setUniform('u_hasRefractionTexture', 'bool', texture !== null ? 1 : 0);
  }

  public getRefractionTexture(): Texture | null {
    return this.refractionTexture;
  }

  public setRefractionStrength(strength: number): void {
    this.setUniform('u_refractionStrength', 'float', strength);
  }

  public getRefractionStrength(): number {
    const uniform = this.getUniform('u_refractionStrength');
    return uniform ? uniform.value as number : 0.02;
  }

  public setReflectionStrength(strength: number): void {
    this.setUniform('u_reflectionStrength', 'float', strength);
  }

  public getReflectionStrength(): number {
    const uniform = this.getUniform('u_reflectionStrength');
    return uniform ? uniform.value as number : 0.5;
  }

  // Presets
  public static createOceanPreset(name: string): WaterConfig {
    return {
      name,
      shaderName: 'water_ocean',
      waterColor: [0.0, 0.3, 0.6],
      deepWaterColor: [0.0, 0.1, 0.3],
      foamColor: [1.0, 1.0, 1.0],
      waveAmplitude: 0.8,
      waveFrequency: 1.2,
      waveSpeed: 0.8,
      foamAmount: 0.4,
      transparency: 0.7,
      refractionStrength: 0.03,
      reflectionStrength: 0.6,
      uniforms: {}
    };
  }

  public static createLakePreset(name: string): WaterConfig {
    return {
      name,
      shaderName: 'water_lake',
      waterColor: [0.2, 0.5, 0.7],
      deepWaterColor: [0.1, 0.2, 0.4],
      foamColor: [0.9, 0.9, 1.0],
      waveAmplitude: 0.1,
      waveFrequency: 3.0,
      waveSpeed: 0.5,
      foamAmount: 0.1,
      transparency: 0.9,
      refractionStrength: 0.01,
      reflectionStrength: 0.8,
      uniforms: {}
    };
  }

  public static createRiverPreset(name: string): WaterConfig {
    return {
      name,
      shaderName: 'water_river',
      waterColor: [0.3, 0.4, 0.5],
      deepWaterColor: [0.1, 0.2, 0.3],
      foamColor: [1.0, 1.0, 1.0],
      waveAmplitude: 0.05,
      waveFrequency: 5.0,
      waveSpeed: 2.0,
      foamAmount: 0.6,
      transparency: 0.6,
      refractionStrength: 0.02,
      reflectionStrength: 0.3,
      uniforms: {}
    };
  }
}