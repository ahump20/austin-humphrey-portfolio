/**
 * Terrain Material
 * Multi-layer terrain material with height-based blending
 */

import { Material, MaterialConfig } from './Material';
import { ShaderManager } from '../shaders/ShaderManager';
import { Texture } from '../core/Texture';
import { vec3 } from 'gl-matrix';

export interface TerrainLayer {
  albedo: vec3;
  metallic: number;
  roughness: number;
  normalScale: number;
  tiling: number;
}

export interface TerrainConfig extends MaterialConfig {
  layers?: TerrainLayer[];
  heightScale?: number;
  splatMapScale?: number;
}

export class TerrainMaterial extends Material {
  private layers: TerrainLayer[] = [];
  private splatMap: Texture | null = null;
  private heightMap: Texture | null = null;
  private layerTextures: Map<number, {
    albedo?: Texture;
    normal?: Texture;
    roughness?: Texture;
  }> = new Map();

  constructor(shaderManager: ShaderManager, config: TerrainConfig) {
    const terrainConfig: MaterialConfig = {
      ...config,
      shaderName: config.shaderName || 'terrain',
      uniforms: {
        u_heightScale: { type: 'float', value: config.heightScale || 10.0 },
        u_splatMapScale: { type: 'float', value: config.splatMapScale || 1.0 },
        u_layerCount: { type: 'int', value: config.layers?.length || 0 },
        ...config.uniforms
      }
    };
    
    if (config.layers) {
      this.layers = [...config.layers];
      this.setupLayerUniforms(terrainConfig);
    }
    
    super(shaderManager, terrainConfig);
  }

  private setupLayerUniforms(config: MaterialConfig): void {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      config.uniforms[`u_layer${i}_albedo`] = { type: 'vec3', value: layer.albedo };
      config.uniforms[`u_layer${i}_metallic`] = { type: 'float', value: layer.metallic };
      config.uniforms[`u_layer${i}_roughness`] = { type: 'float', value: layer.roughness };
      config.uniforms[`u_layer${i}_normalScale`] = { type: 'float', value: layer.normalScale };
      config.uniforms[`u_layer${i}_tiling`] = { type: 'float', value: layer.tiling };
    }
  }

  protected createInstance(config: MaterialConfig): Material {
    return new TerrainMaterial(this.shaderManager, config as TerrainConfig);
  }

  public setSplatMap(texture: Texture | null): void {
    this.splatMap = texture;
    this.setTexture('splatMap', texture);
    this.setUniform('u_hasSplatMap', 'bool', texture !== null ? 1 : 0);
  }

  public getSplatMap(): Texture | null {
    return this.splatMap;
  }

  public setHeightMap(texture: Texture | null): void {
    this.heightMap = texture;
    this.setTexture('heightMap', texture);
    this.setUniform('u_hasHeightMap', 'bool', texture !== null ? 1 : 0);
  }

  public getHeightMap(): Texture | null {
    return this.heightMap;
  }

  public setLayerTexture(layerIndex: number, type: 'albedo' | 'normal' | 'roughness', texture: Texture | null): void {
    if (!this.layerTextures.has(layerIndex)) {
      this.layerTextures.set(layerIndex, {});
    }
    
    const layerTextures = this.layerTextures.get(layerIndex)!;
    layerTextures[type] = texture || undefined;
    
    this.setTexture(`layer${layerIndex}_${type}`, texture);
    this.setUniform(`u_hasLayer${layerIndex}_${type}Map`, 'bool', texture !== null ? 1 : 0);
  }

  public getLayerTexture(layerIndex: number, type: 'albedo' | 'normal' | 'roughness'): Texture | null {
    const layerTextures = this.layerTextures.get(layerIndex);
    return layerTextures?.[type] || null;
  }

  public addLayer(layer: TerrainLayer): void {
    const index = this.layers.length;
    this.layers.push(layer);
    
    this.setUniform(`u_layer${index}_albedo`, 'vec3', layer.albedo);
    this.setUniform(`u_layer${index}_metallic`, 'float', layer.metallic);
    this.setUniform(`u_layer${index}_roughness`, 'float', layer.roughness);
    this.setUniform(`u_layer${index}_normalScale`, 'float', layer.normalScale);
    this.setUniform(`u_layer${index}_tiling`, 'float', layer.tiling);
    this.setUniform('u_layerCount', 'int', this.layers.length);
  }

  public removeLayer(index: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers.splice(index, 1);
      this.layerTextures.delete(index);
      this.setUniform('u_layerCount', 'int', this.layers.length);
      // Would need to reorganize uniforms here in a full implementation
    }
  }

  public getLayer(index: number): TerrainLayer | null {
    return this.layers[index] || null;
  }

  public getLayerCount(): number {
    return this.layers.length;
  }

  public setHeightScale(scale: number): void {
    this.setUniform('u_heightScale', 'float', scale);
  }

  public getHeightScale(): number {
    const uniform = this.getUniform('u_heightScale');
    return uniform ? uniform.value as number : 10.0;
  }
}