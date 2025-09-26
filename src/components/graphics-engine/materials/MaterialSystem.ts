/**
 * Advanced Material System
 * PBR materials with procedural generation and real-time editing
 */

import { ShaderManager } from '../shaders/ShaderManager';
import { Material, MaterialConfig } from './Material';
import { PBRMaterial } from './PBRMaterial';
import { StandardMaterial } from './StandardMaterial';
import { UnlitMaterial } from './UnlitMaterial';
import { TerrainMaterial } from './TerrainMaterial';
import { WaterMaterial } from './WaterMaterial';
import { Texture } from '../core/Texture';

export type MaterialType = 
  | 'pbr' 
  | 'standard' 
  | 'unlit' 
  | 'terrain' 
  | 'water' 
  | 'glass' 
  | 'holographic' 
  | 'procedural';

export interface MaterialTemplate {
  name: string;
  type: MaterialType;
  description: string;
  defaultConfig: MaterialConfig;
  requiredTextures: string[];
  optionalTextures: string[];
  parameters: Record<string, {
    type: string;
    default: any;
    min?: number;
    max?: number;
    description?: string;
  }>;
}

export interface MaterialLibraryEntry {
  material: Material;
  thumbnail?: Texture;
  tags: string[];
  rating: number;
  downloads: number;
  created: Date;
  modified: Date;
}

export class MaterialSystem {
  private shaderManager: ShaderManager;
  private materials: Map<string, Material> = new Map();
  private templates: Map<string, MaterialTemplate> = new Map();
  private library: Map<string, MaterialLibraryEntry> = new Map();
  
  // Material factory
  private materialFactories: Map<MaterialType, (config: MaterialConfig) => Material> = new Map();
  
  // Global material parameters
  private globalParams = {
    environmentIntensity: 1.0,
    shadowIntensity: 1.0,
    ambientIntensity: 0.3,
    specularIntensity: 1.0,
    roughnessOffset: 0.0,
    metallicOffset: 0.0,
    normalIntensity: 1.0
  };
  
  // Material batching for performance
  private materialBatches: Map<string, Material[]> = new Map();
  private batchDirty: boolean = true;
  
  // Statistics
  private stats = {
    materialsCreated: 0,
    materialsLoaded: 0,
    texturesCached: 0,
    batchesOptimized: 0,
    memoryUsage: 0
  };

  constructor(shaderManager: ShaderManager) {
    this.shaderManager = shaderManager;
    this.setupMaterialFactories();
  }

  public async initialize(): Promise<void> {
    await this.loadBuiltInTemplates();
    await this.loadBuiltInMaterials();
    await this.optimizeBatches();
    
    console.log('✅ Material System initialized');
  }

  private setupMaterialFactories(): void {
    this.materialFactories.set('pbr', (config) => new PBRMaterial(this.shaderManager, config));
    this.materialFactories.set('standard', (config) => new StandardMaterial(this.shaderManager, config));
    this.materialFactories.set('unlit', (config) => new UnlitMaterial(this.shaderManager, config));
    this.materialFactories.set('terrain', (config) => new TerrainMaterial(this.shaderManager, config));
    this.materialFactories.set('water', (config) => new WaterMaterial(this.shaderManager, config));
  }

  private async loadBuiltInTemplates(): Promise<void> {
    // PBR Metal template
    this.templates.set('pbr_metal', {
      name: 'PBR Metal',
      type: 'pbr',
      description: 'Physically Based Rendering material for metallic surfaces',
      defaultConfig: {
        name: 'Metal',
        shaderName: 'pbr',
        uniforms: {
          u_albedo: { type: 'vec3', value: [0.9, 0.9, 0.9] },
          u_metallic: { type: 'float', value: 1.0 },
          u_roughness: { type: 'float', value: 0.2 },
          u_normalScale: { type: 'float', value: 1.0 },
          u_emissive: { type: 'vec3', value: [0, 0, 0] },
          u_emissiveIntensity: { type: 'float', value: 0.0 }
        },
        textures: new Map(),
        blending: false,
        doubleSided: false,
        transparent: false
      },
      requiredTextures: [],
      optionalTextures: ['albedo', 'normal', 'metallic', 'roughness', 'ao', 'emissive'],
      parameters: {
        albedo: { type: 'color', default: [0.9, 0.9, 0.9], description: 'Base color' },
        metallic: { type: 'float', default: 1.0, min: 0, max: 1, description: 'Metallic factor' },
        roughness: { type: 'float', default: 0.2, min: 0, max: 1, description: 'Surface roughness' },
        normalScale: { type: 'float', default: 1.0, min: 0, max: 2, description: 'Normal map intensity' }
      }
    });
    
    // PBR Dielectric template
    this.templates.set('pbr_dielectric', {
      name: 'PBR Dielectric',
      type: 'pbr',
      description: 'Physically Based Rendering material for non-metallic surfaces',
      defaultConfig: {
        name: 'Dielectric',
        shaderName: 'pbr',
        uniforms: {
          u_albedo: { type: 'vec3', value: [0.8, 0.8, 0.8] },
          u_metallic: { type: 'float', value: 0.0 },
          u_roughness: { type: 'float', value: 0.5 },
          u_normalScale: { type: 'float', value: 1.0 },
          u_emissive: { type: 'vec3', value: [0, 0, 0] },
          u_emissiveIntensity: { type: 'float', value: 0.0 }
        },
        textures: new Map(),
        blending: false,
        doubleSided: false,
        transparent: false
      },
      requiredTextures: [],
      optionalTextures: ['albedo', 'normal', 'metallic', 'roughness', 'ao'],
      parameters: {
        albedo: { type: 'color', default: [0.8, 0.8, 0.8], description: 'Base color' },
        metallic: { type: 'float', default: 0.0, min: 0, max: 1, description: 'Metallic factor' },
        roughness: { type: 'float', default: 0.5, min: 0, max: 1, description: 'Surface roughness' }
      }
    });
    
    // Glass template
    this.templates.set('glass', {
      name: 'Glass',
      type: 'pbr',
      description: 'Transparent glass material with refraction',
      defaultConfig: {
        name: 'Glass',
        shaderName: 'pbr_transparent',
        uniforms: {
          u_albedo: { type: 'vec3', value: [1.0, 1.0, 1.0] },
          u_metallic: { type: 'float', value: 0.0 },
          u_roughness: { type: 'float', value: 0.0 },
          u_transmission: { type: 'float', value: 1.0 },
          u_ior: { type: 'float', value: 1.52 },
          u_thickness: { type: 'float', value: 0.01 }
        },
        textures: new Map(),
        blending: true,
        doubleSided: true,
        transparent: true
      },
      requiredTextures: [],
      optionalTextures: ['normal', 'roughness'],
      parameters: {
        ior: { type: 'float', default: 1.52, min: 1.0, max: 3.0, description: 'Index of refraction' },
        transmission: { type: 'float', default: 1.0, min: 0, max: 1, description: 'Transmission factor' },
        thickness: { type: 'float', default: 0.01, min: 0, max: 1, description: 'Glass thickness' }
      }
    });
    
    // Water template
    this.templates.set('water', {
      name: 'Water',
      type: 'water',
      description: 'Animated water surface with waves and reflections',
      defaultConfig: {
        name: 'Water',
        shaderName: 'water',
        uniforms: {
          u_waterColor: { type: 'vec3', value: [0.0, 0.4, 0.8] },
          u_waveAmplitude: { type: 'float', value: 0.1 },
          u_waveFrequency: { type: 'float', value: 2.0 },
          u_waveSpeed: { type: 'float', value: 1.0 },
          u_foamColor: { type: 'vec3', value: [1.0, 1.0, 1.0] },
          u_foamAmount: { type: 'float', value: 0.3 }
        },
        textures: new Map(),
        blending: true,
        doubleSided: false,
        transparent: true
      },
      requiredTextures: ['normal'],
      optionalTextures: ['foam', 'depth'],
      parameters: {
        waterColor: { type: 'color', default: [0.0, 0.4, 0.8], description: 'Water base color' },
        waveAmplitude: { type: 'float', default: 0.1, min: 0, max: 1, description: 'Wave height' },
        waveFrequency: { type: 'float', default: 2.0, min: 0.1, max: 10, description: 'Wave frequency' },
        waveSpeed: { type: 'float', default: 1.0, min: 0, max: 5, description: 'Wave animation speed' }
      }
    });
  }

  private async loadBuiltInMaterials(): Promise<void> {
    // Create some basic materials
    const basicMetal = this.createMaterial('basic_metal', 'pbr_metal');
    basicMetal.setUniform('u_albedo', 'vec3', [0.7, 0.7, 0.8]);
    basicMetal.setUniform('u_roughness', 'float', 0.3);
    
    const basicPlastic = this.createMaterial('basic_plastic', 'pbr_dielectric');
    basicPlastic.setUniform('u_albedo', 'vec3', [0.2, 0.8, 0.3]);
    basicPlastic.setUniform('u_roughness', 'float', 0.7);
    
    const glass = this.createMaterial('clear_glass', 'glass');
    
    this.stats.materialsLoaded += 3;
  }

  public createMaterial(name: string, templateName: string, customConfig?: Partial<MaterialConfig>): Material {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    const factory = this.materialFactories.get(template.type);
    if (!factory) {
      throw new Error(`Material factory not found for type: ${template.type}`);
    }
    
    const config: MaterialConfig = {
      ...template.defaultConfig,
      name,
      ...customConfig
    };
    
    const material = factory(config);
    material.setTemplate(template);
    
    this.materials.set(name, material);
    this.batchDirty = true;
    this.stats.materialsCreated++;
    
    return material;
  }

  public createPBRMaterial(config: {
    name?: string;
    albedo?: [number, number, number];
    metallic?: number;
    roughness?: number;
    normal?: Texture | null;
    ao?: Texture | null;
    height?: Texture | null;
    emissive?: [number, number, number];
    transparent?: boolean;
  }): PBRMaterial {
    const materialConfig: MaterialConfig = {
      name: config.name || 'PBR_Material',
      shaderName: config.transparent ? 'pbr_transparent' : 'pbr',
      uniforms: {
        u_albedo: { type: 'vec3', value: config.albedo || [1, 1, 1] },
        u_metallic: { type: 'float', value: config.metallic || 0.0 },
        u_roughness: { type: 'float', value: config.roughness || 0.5 },
        u_normalScale: { type: 'float', value: 1.0 },
        u_emissive: { type: 'vec3', value: config.emissive || [0, 0, 0] },
        u_emissiveIntensity: { type: 'float', value: 0.0 }
      },
      textures: new Map(),
      blending: config.transparent || false,
      doubleSided: false,
      transparent: config.transparent || false
    };
    
    // Add textures if provided
    if (config.normal) materialConfig.textures!.set('normal', config.normal);
    if (config.ao) materialConfig.textures!.set('ao', config.ao);
    if (config.height) materialConfig.textures!.set('height', config.height);
    
    const material = new PBRMaterial(this.shaderManager, materialConfig);
    this.materials.set(materialConfig.name, material);
    this.batchDirty = true;
    
    return material;
  }

  public getMaterial(name: string): Material | null {
    return this.materials.get(name) || null;
  }

  public getAllMaterials(): Map<string, Material> {
    return new Map(this.materials);
  }

  public getMaterialsByType(type: MaterialType): Material[] {
    return Array.from(this.materials.values()).filter(material => 
      material.getTemplate()?.type === type
    );
  }

  public cloneMaterial(sourceName: string, newName: string): Material | null {
    const source = this.materials.get(sourceName);
    if (!source) return null;
    
    const cloned = source.clone(newName);
    this.materials.set(newName, cloned);
    this.batchDirty = true;
    
    return cloned;
  }

  public deleteMaterial(name: string): boolean {
    const material = this.materials.get(name);
    if (!material) return false;
    
    material.cleanup();
    this.materials.delete(name);
    this.batchDirty = true;
    
    return true;
  }

  public getTemplate(name: string): MaterialTemplate | null {
    return this.templates.get(name) || null;
  }

  public getAllTemplates(): Map<string, MaterialTemplate> {
    return new Map(this.templates);
  }

  public addTemplate(template: MaterialTemplate): void {
    this.templates.set(template.name, template);
  }

  public removeTemplate(name: string): boolean {
    return this.templates.delete(name);
  }

  // Material batching for performance optimization
  private async optimizeBatches(): Promise<void> {
    if (!this.batchDirty) return;
    
    this.materialBatches.clear();
    
    // Group materials by shader and blend mode
    for (const material of this.materials.values()) {
      const batchKey = `${material.getShaderName()}_${material.isTransparent() ? 'transparent' : 'opaque'}`;
      
      if (!this.materialBatches.has(batchKey)) {
        this.materialBatches.set(batchKey, []);
      }
      
      this.materialBatches.get(batchKey)!.push(material);
    }
    
    this.batchDirty = false;
    this.stats.batchesOptimized++;
  }

  public getBatches(): Map<string, Material[]> {
    if (this.batchDirty) {
      this.optimizeBatches();
    }
    return new Map(this.materialBatches);
  }

  // Global material parameters
  public setGlobalParameter(name: keyof typeof this.globalParams, value: number): void {
    if (name in this.globalParams) {
      (this.globalParams as any)[name] = value;
      
      // Update all materials
      for (const material of this.materials.values()) {
        material.setGlobalParameter(name, value);
      }
    }
  }

  public getGlobalParameter(name: keyof typeof this.globalParams): number {
    return this.globalParams[name];
  }

  public getGlobalParameters(): typeof this.globalParams {
    return { ...this.globalParams };
  }

  // Material library management
  public addToLibrary(materialName: string, tags: string[] = [], rating: number = 0): boolean {
    const material = this.materials.get(materialName);
    if (!material) return false;
    
    this.library.set(materialName, {
      material,
      tags,
      rating,
      downloads: 0,
      created: new Date(),
      modified: new Date()
    });
    
    return true;
  }

  public removeFromLibrary(materialName: string): boolean {
    return this.library.delete(materialName);
  }

  public searchLibrary(query: string, tags?: string[]): MaterialLibraryEntry[] {
    const results: MaterialLibraryEntry[] = [];
    
    for (const [name, entry] of this.library) {
      // Check name match
      if (name.toLowerCase().includes(query.toLowerCase())) {
        results.push(entry);
        continue;
      }
      
      // Check tag match
      if (tags) {
        const hasMatchingTag = tags.some(tag => entry.tags.includes(tag));
        if (hasMatchingTag) {
          results.push(entry);
        }
      }
    }
    
    // Sort by rating
    return results.sort((a, b) => b.rating - a.rating);
  }

  // Procedural material generation
  public generateProceduralMaterial(name: string, type: 'metal' | 'plastic' | 'wood' | 'stone' | 'fabric'): Material {
    let template: string;
    let params: any = {};
    
    switch (type) {
      case 'metal':
        template = 'pbr_metal';
        params = {
          albedo: this.randomMetalColor(),
          roughness: 0.1 + Math.random() * 0.4,
          metallic: 0.8 + Math.random() * 0.2
        };
        break;
        
      case 'plastic':
        template = 'pbr_dielectric';
        params = {
          albedo: this.randomPlasticColor(),
          roughness: 0.3 + Math.random() * 0.5,
          metallic: 0.0
        };
        break;
        
      default:
        template = 'pbr_dielectric';
        params = {
          albedo: [Math.random(), Math.random(), Math.random()],
          roughness: Math.random(),
          metallic: Math.random() * 0.2
        };
    }
    
    const material = this.createMaterial(name, template);
    
    // Apply procedural parameters
    for (const [key, value] of Object.entries(params)) {
      const uniformName = `u_${key}`;
      const uniformType = Array.isArray(value) ? 'vec3' : 'float';
      material.setUniform(uniformName, uniformType as any, value);
    }
    
    return material;
  }

  private randomMetalColor(): [number, number, number] {
    const metalColors = [
      [0.95, 0.93, 0.88], // Silver
      [1.00, 0.86, 0.57], // Gold
      [0.95, 0.64, 0.54], // Copper
      [0.76, 0.77, 0.78], // Steel
      [0.55, 0.56, 0.67], // Titanium
    ];
    
    return metalColors[Math.floor(Math.random() * metalColors.length)];
  }

  private randomPlasticColor(): [number, number, number] {
    // Generate saturated colors for plastic
    const hue = Math.random() * 360;
    const saturation = 0.6 + Math.random() * 0.4;
    const lightness = 0.4 + Math.random() * 0.4;
    
    return this.hslToRgb(hue, saturation, lightness);
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [f(0), f(8), f(4)];
  }

  // Performance and memory management
  public getStats(): typeof this.stats {
    // Update memory usage
    this.stats.memoryUsage = 0;
    for (const material of this.materials.values()) {
      this.stats.memoryUsage += material.getMemoryUsage();
    }
    
    return { ...this.stats };
  }

  public preloadMaterials(materialNames: string[]): Promise<void[]> {
    const promises = materialNames.map(name => {
      const material = this.materials.get(name);
      return material ? material.preload() : Promise.resolve();
    });
    
    return Promise.all(promises);
  }

  public cleanup(): void {
    // Cleanup all materials
    for (const material of this.materials.values()) {
      material.cleanup();
    }
    
    // Clear collections
    this.materials.clear();
    this.templates.clear();
    this.library.clear();
    this.materialBatches.clear();
    
    console.log('✅ Material System cleanup complete');
  }
}