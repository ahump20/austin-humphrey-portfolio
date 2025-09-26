/**
 * Physically Based Rendering Material
 * Advanced PBR material with full metallic-roughness workflow
 */

import { Material, MaterialConfig } from './Material';
import { ShaderManager } from '../shaders/ShaderManager';
import { ShaderProgram } from '../shaders/ShaderProgram';
import { Texture } from '../core/Texture';
import { vec3 } from 'gl-matrix';

export interface PBRConfig extends MaterialConfig {
  // Base material properties
  albedo?: vec3;
  metallic?: number;
  roughness?: number;
  normalScale?: number;
  emissive?: vec3;
  emissiveIntensity?: number;
  
  // Advanced PBR properties
  transmission?: number;
  transmissionRoughness?: number;
  ior?: number;
  thickness?: number;
  attenuationDistance?: number;
  attenuationColor?: vec3;
  
  // Sheen properties (for cloth-like materials)
  sheen?: number;
  sheenColor?: vec3;
  sheenRoughness?: number;
  
  // Clearcoat properties (for car paint, etc.)
  clearcoat?: number;
  clearcoatRoughness?: number;
  clearcoatNormalScale?: number;
  
  // Subsurface scattering
  subsurface?: number;
  subsurfaceColor?: vec3;
  subsurfaceRadius?: vec3;
  
  // Anisotropy
  anisotropy?: number;
  anisotropyRotation?: number;
}

export class PBRMaterial extends Material {
  private environmentMap: Texture | null = null;
  private irradianceMap: Texture | null = null;
  private prefilterMap: Texture | null = null;
  private brdfLUT: Texture | null = null;
  
  // Material maps
  private albedoMap: Texture | null = null;
  private normalMap: Texture | null = null;
  private metallicRoughnessMap: Texture | null = null;
  private aoMap: Texture | null = null;
  private emissiveMap: Texture | null = null;
  private heightMap: Texture | null = null;
  
  // Advanced maps
  private transmissionMap: Texture | null = null;
  private sheenColorMap: Texture | null = null;
  private sheenRoughnessMap: Texture | null = null;
  private clearcoatMap: Texture | null = null;
  private clearcoatRoughnessMap: Texture | null = null;
  private clearcoatNormalMap: Texture | null = null;
  private anisotropyMap: Texture | null = null;

  constructor(shaderManager: ShaderManager, config: PBRConfig) {
    // Set default PBR uniforms
    const pbrConfig: MaterialConfig = {
      ...config,
      uniforms: {
        // Base PBR uniforms
        u_albedo: { type: 'vec3', value: config.albedo || [1.0, 1.0, 1.0] },
        u_metallic: { type: 'float', value: config.metallic || 0.0 },
        u_roughness: { type: 'float', value: config.roughness || 0.5 },
        u_normalScale: { type: 'float', value: config.normalScale || 1.0 },
        u_emissive: { type: 'vec3', value: config.emissive || [0.0, 0.0, 0.0] },
        u_emissiveIntensity: { type: 'float', value: config.emissiveIntensity || 0.0 },
        u_ao: { type: 'float', value: 1.0 },
        
        // Transmission
        u_transmission: { type: 'float', value: config.transmission || 0.0 },
        u_transmissionRoughness: { type: 'float', value: config.transmissionRoughness || 0.0 },
        u_ior: { type: 'float', value: config.ior || 1.5 },
        u_thickness: { type: 'float', value: config.thickness || 0.0 },
        u_attenuationDistance: { type: 'float', value: config.attenuationDistance || 0.0 },
        u_attenuationColor: { type: 'vec3', value: config.attenuationColor || [1.0, 1.0, 1.0] },
        
        // Sheen
        u_sheen: { type: 'float', value: config.sheen || 0.0 },
        u_sheenColor: { type: 'vec3', value: config.sheenColor || [0.0, 0.0, 0.0] },
        u_sheenRoughness: { type: 'float', value: config.sheenRoughness || 0.0 },
        
        // Clearcoat
        u_clearcoat: { type: 'float', value: config.clearcoat || 0.0 },
        u_clearcoatRoughness: { type: 'float', value: config.clearcoatRoughness || 0.0 },
        u_clearcoatNormalScale: { type: 'float', value: config.clearcoatNormalScale || 1.0 },
        
        // Subsurface
        u_subsurface: { type: 'float', value: config.subsurface || 0.0 },
        u_subsurfaceColor: { type: 'vec3', value: config.subsurfaceColor || [1.0, 1.0, 1.0] },
        u_subsurfaceRadius: { type: 'vec3', value: config.subsurfaceRadius || [1.0, 1.0, 1.0] },
        
        // Anisotropy
        u_anisotropy: { type: 'float', value: config.anisotropy || 0.0 },
        u_anisotropyRotation: { type: 'float', value: config.anisotropyRotation || 0.0 },
        
        // Environment
        u_environmentIntensity: { type: 'float', value: 1.0 },
        u_environmentRotation: { type: 'float', value: 0.0 },
        
        // Global parameters
        u_exposure: { type: 'float', value: 1.0 },
        u_gamma: { type: 'float', value: 2.2 },
        
        ...config.uniforms
      }
    };
    
    super(shaderManager, pbrConfig);
  }

  protected createInstance(config: MaterialConfig): Material {
    return new PBRMaterial(this.shaderManager, config as PBRConfig);
  }

  // Albedo (Base Color)
  public setAlbedo(color: vec3): void {
    this.setUniform('u_albedo', 'vec3', color);
  }

  public getAlbedo(): vec3 {
    const uniform = this.getUniform('u_albedo');
    return uniform ? uniform.value as vec3 : [1, 1, 1];
  }

  public setAlbedoMap(texture: Texture | null): void {
    this.albedoMap = texture;
    this.setTexture('albedo', texture);
    this.setUniform('u_hasAlbedoMap', 'bool', texture !== null ? 1 : 0);
  }

  public getAlbedoMap(): Texture | null {
    return this.albedoMap;
  }

  // Metallic
  public setMetallic(metallic: number): void {
    this.setUniform('u_metallic', 'float', metallic);
  }

  public getMetallic(): number {
    const uniform = this.getUniform('u_metallic');
    return uniform ? uniform.value as number : 0.0;
  }

  // Roughness
  public setRoughness(roughness: number): void {
    this.setUniform('u_roughness', 'float', roughness);
  }

  public getRoughness(): number {
    const uniform = this.getUniform('u_roughness');
    return uniform ? uniform.value as number : 0.5;
  }

  // Metallic-Roughness map (R = unused, G = roughness, B = metallic)
  public setMetallicRoughnessMap(texture: Texture | null): void {
    this.metallicRoughnessMap = texture;
    this.setTexture('metallicRoughness', texture);
    this.setUniform('u_hasMetallicRoughnessMap', 'bool', texture !== null ? 1 : 0);
  }

  public getMetallicRoughnessMap(): Texture | null {
    return this.metallicRoughnessMap;
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

  public setNormalScale(scale: number): void {
    this.setUniform('u_normalScale', 'float', scale);
  }

  public getNormalScale(): number {
    const uniform = this.getUniform('u_normalScale');
    return uniform ? uniform.value as number : 1.0;
  }

  // Ambient Occlusion
  public setAOMap(texture: Texture | null): void {
    this.aoMap = texture;
    this.setTexture('ao', texture);
    this.setUniform('u_hasAOMap', 'bool', texture !== null ? 1 : 0);
  }

  public getAOMap(): Texture | null {
    return this.aoMap;
  }

  // Emissive
  public setEmissive(color: vec3): void {
    this.setUniform('u_emissive', 'vec3', color);
  }

  public getEmissive(): vec3 {
    const uniform = this.getUniform('u_emissive');
    return uniform ? uniform.value as vec3 : [0, 0, 0];
  }

  public setEmissiveIntensity(intensity: number): void {
    this.setUniform('u_emissiveIntensity', 'float', intensity);
  }

  public getEmissiveIntensity(): number {
    const uniform = this.getUniform('u_emissiveIntensity');
    return uniform ? uniform.value as number : 0.0;
  }

  public setEmissiveMap(texture: Texture | null): void {
    this.emissiveMap = texture;
    this.setTexture('emissive', texture);
    this.setUniform('u_hasEmissiveMap', 'bool', texture !== null ? 1 : 0);
  }

  public getEmissiveMap(): Texture | null {
    return this.emissiveMap;
  }

  // Height/Displacement mapping
  public setHeightMap(texture: Texture | null): void {
    this.heightMap = texture;
    this.setTexture('height', texture);
    this.setUniform('u_hasHeightMap', 'bool', texture !== null ? 1 : 0);
  }

  public getHeightMap(): Texture | null {
    return this.heightMap;
  }

  public setHeightScale(scale: number): void {
    this.setUniform('u_heightScale', 'float', scale);
  }

  // Transmission (for glass-like materials)
  public setTransmission(transmission: number): void {
    this.setUniform('u_transmission', 'float', transmission);
  }

  public getTransmission(): number {
    const uniform = this.getUniform('u_transmission');
    return uniform ? uniform.value as number : 0.0;
  }

  public setTransmissionMap(texture: Texture | null): void {
    this.transmissionMap = texture;
    this.setTexture('transmission', texture);
    this.setUniform('u_hasTransmissionMap', 'bool', texture !== null ? 1 : 0);
  }

  public setIOR(ior: number): void {
    this.setUniform('u_ior', 'float', ior);
  }

  public getIOR(): number {
    const uniform = this.getUniform('u_ior');
    return uniform ? uniform.value as number : 1.5;
  }

  public setThickness(thickness: number): void {
    this.setUniform('u_thickness', 'float', thickness);
  }

  public getThickness(): number {
    const uniform = this.getUniform('u_thickness');
    return uniform ? uniform.value as number : 0.0;
  }

  // Sheen (for cloth-like materials)
  public setSheen(sheen: number): void {
    this.setUniform('u_sheen', 'float', sheen);
  }

  public setSheenColor(color: vec3): void {
    this.setUniform('u_sheenColor', 'vec3', color);
  }

  public setSheenRoughness(roughness: number): void {
    this.setUniform('u_sheenRoughness', 'float', roughness);
  }

  public setSheenColorMap(texture: Texture | null): void {
    this.sheenColorMap = texture;
    this.setTexture('sheenColor', texture);
    this.setUniform('u_hasSheenColorMap', 'bool', texture !== null ? 1 : 0);
  }

  public setSheenRoughnessMap(texture: Texture | null): void {
    this.sheenRoughnessMap = texture;
    this.setTexture('sheenRoughness', texture);
    this.setUniform('u_hasSheenRoughnessMap', 'bool', texture !== null ? 1 : 0);
  }

  // Clearcoat (for car paint, etc.)
  public setClearcoat(clearcoat: number): void {
    this.setUniform('u_clearcoat', 'float', clearcoat);
  }

  public setClearcoatRoughness(roughness: number): void {
    this.setUniform('u_clearcoatRoughness', 'float', roughness);
  }

  public setClearcoatNormalScale(scale: number): void {
    this.setUniform('u_clearcoatNormalScale', 'float', scale);
  }

  public setClearcoatMap(texture: Texture | null): void {
    this.clearcoatMap = texture;
    this.setTexture('clearcoat', texture);
    this.setUniform('u_hasClearcoatMap', 'bool', texture !== null ? 1 : 0);
  }

  public setClearcoatRoughnessMap(texture: Texture | null): void {
    this.clearcoatRoughnessMap = texture;
    this.setTexture('clearcoatRoughness', texture);
    this.setUniform('u_hasClearcoatRoughnessMap', 'bool', texture !== null ? 1 : 0);
  }

  public setClearcoatNormalMap(texture: Texture | null): void {
    this.clearcoatNormalMap = texture;
    this.setTexture('clearcoatNormal', texture);
    this.setUniform('u_hasClearcoatNormalMap', 'bool', texture !== null ? 1 : 0);
  }

  // Anisotropy (for brushed metal, etc.)
  public setAnisotropy(anisotropy: number): void {
    this.setUniform('u_anisotropy', 'float', anisotropy);
  }

  public setAnisotropyRotation(rotation: number): void {
    this.setUniform('u_anisotropyRotation', 'float', rotation);
  }

  public setAnisotropyMap(texture: Texture | null): void {
    this.anisotropyMap = texture;
    this.setTexture('anisotropy', texture);
    this.setUniform('u_hasAnisotropyMap', 'bool', texture !== null ? 1 : 0);
  }

  // Environment mapping
  public setEnvironmentMap(texture: Texture | null): void {
    this.environmentMap = texture;
    this.setTexture('environment', texture);
    this.setUniform('u_hasEnvironmentMap', 'bool', texture !== null ? 1 : 0);
  }

  public getEnvironmentMap(): Texture | null {
    return this.environmentMap;
  }

  public setIrradianceMap(texture: Texture | null): void {
    this.irradianceMap = texture;
    this.setTexture('irradiance', texture);
    this.setUniform('u_hasIrradianceMap', 'bool', texture !== null ? 1 : 0);
  }

  public setPrefilterMap(texture: Texture | null): void {
    this.prefilterMap = texture;
    this.setTexture('prefilter', texture);
    this.setUniform('u_hasPrefilterMap', 'bool', texture !== null ? 1 : 0);
  }

  public setBRDFLUT(texture: Texture | null): void {
    this.brdfLUT = texture;
    this.setTexture('brdfLUT', texture);
    this.setUniform('u_hasBRDFLUT', 'bool', texture !== null ? 1 : 0);
  }

  public setEnvironmentIntensity(intensity: number): void {
    this.setUniform('u_environmentIntensity', 'float', intensity);
  }

  public setEnvironmentRotation(rotation: number): void {
    this.setUniform('u_environmentRotation', 'float', rotation);
  }

  // Global parameters override
  public setGlobalParameter(name: string, value: number): void {
    switch (name) {
      case 'environmentIntensity':
        this.setEnvironmentIntensity(this.getEnvironmentIntensity() * value);
        break;
      case 'roughnessOffset':
        this.setRoughness(Math.max(0, Math.min(1, this.getRoughness() + value)));
        break;
      case 'metallicOffset':
        this.setMetallic(Math.max(0, Math.min(1, this.getMetallic() + value)));
        break;
      case 'normalIntensity':
        this.setNormalScale(this.getNormalScale() * value);
        break;
    }
  }

  private getEnvironmentIntensity(): number {
    const uniform = this.getUniform('u_environmentIntensity');
    return uniform ? uniform.value as number : 1.0;
  }

  // Material presets
  public static createMetal(name: string, albedo: vec3, roughness: number = 0.1): PBRConfig {
    return {
      name,
      shaderName: 'pbr',
      albedo,
      metallic: 1.0,
      roughness,
      uniforms: {}
    };
  }

  public static createDielectric(name: string, albedo: vec3, roughness: number = 0.5): PBRConfig {
    return {
      name,
      shaderName: 'pbr',
      albedo,
      metallic: 0.0,
      roughness,
      uniforms: {}
    };
  }

  public static createGlass(name: string, color: vec3, roughness: number = 0.0, ior: number = 1.5): PBRConfig {
    return {
      name,
      shaderName: 'pbr_transmission',
      albedo: color,
      metallic: 0.0,
      roughness,
      transmission: 1.0,
      ior,
      transparent: true,
      uniforms: {}
    };
  }

  public static createCloth(name: string, albedo: vec3, sheenColor: vec3, roughness: number = 0.8): PBRConfig {
    return {
      name,
      shaderName: 'pbr_sheen',
      albedo,
      metallic: 0.0,
      roughness,
      sheen: 1.0,
      sheenColor,
      uniforms: {}
    };
  }

  public static createCarPaint(name: string, baseColor: vec3, clearcoat: number = 1.0): PBRConfig {
    return {
      name,
      shaderName: 'pbr_clearcoat',
      albedo: baseColor,
      metallic: 0.0,
      roughness: 0.5,
      clearcoat,
      clearcoatRoughness: 0.03,
      uniforms: {}
    };
  }

  // Validation specific to PBR
  public validate(): { valid: boolean; errors: string[] } {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];
    
    // Check PBR-specific constraints
    const metallic = this.getMetallic();
    if (metallic < 0 || metallic > 1) {
      errors.push('Metallic value must be between 0 and 1');
    }
    
    const roughness = this.getRoughness();
    if (roughness < 0 || roughness > 1) {
      errors.push('Roughness value must be between 0 and 1');
    }
    
    const transmission = this.getTransmission();
    if (transmission < 0 || transmission > 1) {
      errors.push('Transmission value must be between 0 and 1');
    }
    
    const ior = this.getIOR();
    if (ior < 1.0) {
      errors.push('IOR value must be greater than or equal to 1.0');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  public toString(): string {
    return `PBRMaterial: ${this.getName()}
      Albedo: [${this.getAlbedo().join(', ')}]
      Metallic: ${this.getMetallic()}
      Roughness: ${this.getRoughness()}
      Transmission: ${this.getTransmission()}
      IOR: ${this.getIOR()}
      Environment: ${this.environmentMap ? 'Yes' : 'No'}
      ${super.toString()}`;
  }
}