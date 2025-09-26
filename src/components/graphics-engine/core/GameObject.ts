/**
 * GameObject System
 * Core entity in the scene graph
 */

import { Transform } from './Transform';
import { Mesh } from './Mesh';
import { Material } from '../materials/Material';
import { Component } from './Component';
import { vec3 } from 'gl-matrix';

export interface GameObjectConfig {
  name?: string;
  visible?: boolean;
  castShadows?: boolean;
  receiveShadows?: boolean;
  frustumCulled?: boolean;
  renderOrder?: number;
  userData?: any;
}

export class GameObject {
  private id: string;
  private name: string;
  private transform: Transform;
  private mesh: Mesh | null;
  private material: Material | null;
  private components: Map<string, Component> = new Map();
  private children: GameObject[] = [];
  private parent: GameObject | null = null;
  
  private visible: boolean = true;
  private castShadows: boolean = true;
  private receiveShadows: boolean = true;
  private frustumCulled: boolean = true;
  private renderOrder: number = 0;
  private userData: any = {};
  
  private updateCallbacks: Function[] = [];
  private renderCallbacks: Function[] = [];
  
  // Bounding volume for culling
  private boundingRadius: number = 1.0;
  private boundingCenter: vec3 = vec3.create();
  private boundingMin: vec3 = vec3.create();
  private boundingMax: vec3 = vec3.create();
  private boundingDirty: boolean = true;

  constructor(name?: string, mesh?: Mesh, material?: Material, transform?: Transform) {
    this.id = this.generateId();
    this.name = name || `GameObject_${this.id}`;
    this.transform = transform || new Transform();
    this.mesh = mesh || null;
    this.material = material || null;
    
    this.updateBounds();
  }

  private generateId(): string {
    return 'go_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  // Basic properties
  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public setName(name: string): void {
    this.name = name;
  }

  public getTransform(): Transform {
    return this.transform;
  }

  public setTransform(transform: Transform): void {
    this.transform = transform;
    this.markBoundingDirty();
  }

  public getMesh(): Mesh | null {
    return this.mesh;
  }

  public setMesh(mesh: Mesh | null): void {
    this.mesh = mesh;
    this.markBoundingDirty();
  }

  public getMaterial(): Material | null {
    return this.material;
  }

  public setMaterial(material: Material | null): void {
    this.material = material;
  }

  // Visibility and rendering properties
  public isVisible(): boolean {
    return this.visible;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
  }

  public getCastShadows(): boolean {
    return this.castShadows;
  }

  public setCastShadows(castShadows: boolean): void {
    this.castShadows = castShadows;
  }

  public getReceiveShadows(): boolean {
    return this.receiveShadows;
  }

  public setReceiveShadows(receiveShadows: boolean): void {
    this.receiveShadows = receiveShadows;
  }

  public getFrustumCulled(): boolean {
    return this.frustumCulled;
  }

  public setFrustumCulled(frustumCulled: boolean): void {
    this.frustumCulled = frustumCulled;
  }

  public getRenderOrder(): number {
    return this.renderOrder;
  }

  public setRenderOrder(renderOrder: number): void {
    this.renderOrder = renderOrder;
  }

  public getUserData(): any {
    return this.userData;
  }

  public setUserData(userData: any): void {
    this.userData = userData;
  }

  // Component system
  public addComponent<T extends Component>(component: T): T {
    const componentName = component.constructor.name;
    if (this.components.has(componentName)) {
      console.warn(`Component ${componentName} already exists on ${this.name}`);
      return this.components.get(componentName) as T;
    }
    
    this.components.set(componentName, component);
    component.setGameObject(this);
    component.onAttach();
    
    return component;
  }

  public removeComponent<T extends Component>(componentClass: new (...args: any[]) => T): boolean {
    const componentName = componentClass.name;
    const component = this.components.get(componentName);
    
    if (component) {
      component.onDetach();
      component.setGameObject(null);
      this.components.delete(componentName);
      return true;
    }
    
    return false;
  }

  public getComponent<T extends Component>(componentClass: new (...args: any[]) => T): T | null {
    const componentName = componentClass.name;
    return (this.components.get(componentName) as T) || null;
  }

  public hasComponent<T extends Component>(componentClass: new (...args: any[]) => T): boolean {
    const componentName = componentClass.name;
    return this.components.has(componentName);
  }

  public getComponents(): Component[] {
    return Array.from(this.components.values());
  }

  // Hierarchy management
  public addChild(child: GameObject): void {
    if (child.parent === this) return;
    
    if (child.parent) {
      child.parent.removeChild(child);
    }
    
    this.children.push(child);
    child.parent = this;
    child.transform.setParent(this.transform);
  }

  public removeChild(child: GameObject): boolean {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      child.transform.setParent(null);
      return true;
    }
    return false;
  }

  public getChildren(): GameObject[] {
    return [...this.children];
  }

  public getParent(): GameObject | null {
    return this.parent;
  }

  public getChildByName(name: string): GameObject | null {
    for (const child of this.children) {
      if (child.name === name) {
        return child;
      }
      
      const grandChild = child.getChildByName(name);
      if (grandChild) {
        return grandChild;
      }
    }
    return null;
  }

  public getChildById(id: string): GameObject | null {
    for (const child of this.children) {
      if (child.id === id) {
        return child;
      }
      
      const grandChild = child.getChildById(id);
      if (grandChild) {
        return grandChild;
      }
    }
    return null;
  }

  // Bounding volume methods
  private updateBounds(): void {
    if (!this.boundingDirty) return;
    
    if (this.mesh) {
      const bounds = this.mesh.getBounds();
      vec3.copy(this.boundingMin, bounds.min);
      vec3.copy(this.boundingMax, bounds.max);
      
      // Calculate center
      vec3.add(this.boundingCenter, bounds.min, bounds.max);
      vec3.scale(this.boundingCenter, this.boundingCenter, 0.5);
      
      // Calculate radius
      const size = vec3.create();
      vec3.subtract(size, bounds.max, bounds.min);
      this.boundingRadius = vec3.length(size) * 0.5;
    } else {
      vec3.set(this.boundingMin, -0.5, -0.5, -0.5);
      vec3.set(this.boundingMax, 0.5, 0.5, 0.5);
      vec3.set(this.boundingCenter, 0, 0, 0);
      this.boundingRadius = 0.5;
    }
    
    // Transform bounds to world space
    const worldCenter = this.transform.transformPoint(this.boundingCenter);
    vec3.copy(this.boundingCenter, worldCenter);
    
    const worldScale = this.transform.getWorldScale();
    const maxScale = Math.max(worldScale[0], worldScale[1], worldScale[2]);
    this.boundingRadius *= maxScale;
    
    this.boundingDirty = false;
  }

  public getBoundingRadius(): number {
    this.updateBounds();
    return this.boundingRadius;
  }

  public getBoundingCenter(): vec3 {
    this.updateBounds();
    return vec3.clone(this.boundingCenter);
  }

  public getBoundingBox(): { min: vec3; max: vec3 } {
    this.updateBounds();
    return {
      min: vec3.clone(this.boundingMin),
      max: vec3.clone(this.boundingMax)
    };
  }

  private markBoundingDirty(): void {
    this.boundingDirty = true;
    // Mark children as dirty too
    for (const child of this.children) {
      child.markBoundingDirty();
    }
  }

  // Update callbacks
  public addUpdateCallback(callback: Function): void {
    this.updateCallbacks.push(callback);
  }

  public removeUpdateCallback(callback: Function): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index !== -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  public addRenderCallback(callback: Function): void {
    this.renderCallbacks.push(callback);
  }

  public removeRenderCallback(callback: Function): void {
    const index = this.renderCallbacks.indexOf(callback);
    if (index !== -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  // Lifecycle methods
  public update(deltaTime: number): void {
    // Update components
    for (const component of this.components.values()) {
      if (component.isActive()) {
        component.update(deltaTime);
      }
    }
    
    // Update children
    for (const child of this.children) {
      if (child.visible) {
        child.update(deltaTime);
      }
    }
    
    // Execute update callbacks
    for (const callback of this.updateCallbacks) {
      callback(deltaTime, this);
    }
    
    // Update bounds if needed
    if (this.boundingDirty) {
      this.updateBounds();
    }
  }

  public render(): void {
    if (!this.visible) return;
    
    // Render components
    for (const component of this.components.values()) {
      if (component.isActive()) {
        component.render();
      }
    }
    
    // Execute render callbacks
    for (const callback of this.renderCallbacks) {
      callback(this);
    }
    
    // Render children
    for (const child of this.children) {
      if (child.visible) {
        child.render();
      }
    }
  }

  // Utility methods
  public lookAt(target: vec3, up?: vec3): void {
    this.transform.lookAt(target, up);
  }

  public distanceTo(other: GameObject): number {
    const thisPos = this.transform.getWorldPosition();
    const otherPos = other.transform.getWorldPosition();
    return vec3.distance(thisPos, otherPos);
  }

  public directionTo(other: GameObject): vec3 {
    const thisPos = this.transform.getWorldPosition();
    const otherPos = other.transform.getWorldPosition();
    const direction = vec3.create();
    vec3.subtract(direction, otherPos, thisPos);
    vec3.normalize(direction, direction);
    return direction;
  }

  public getWorldPosition(): vec3 {
    return this.transform.getWorldPosition();
  }

  public getWorldRotation(): any {
    return this.transform.getWorldRotation();
  }

  public getWorldScale(): vec3 {
    return this.transform.getWorldScale();
  }

  // Animation support
  public moveTo(targetPosition: vec3, duration: number, easing?: (t: number) => number): Promise<void> {
    return new Promise((resolve) => {
      const startPosition = this.transform.getPosition();
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        const easedProgress = easing ? easing(progress) : progress;
        
        const currentPosition = vec3.create();
        vec3.lerp(currentPosition, startPosition, targetPosition, easedProgress);
        this.transform.setPosition(currentPosition);
        
        if (progress < 1.0) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }

  public rotateTo(targetRotation: any, duration: number, easing?: (t: number) => number): Promise<void> {
    return new Promise((resolve) => {
      const startRotation = this.transform.getRotation();
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        const easedProgress = easing ? easing(progress) : progress;
        
        const currentRotation = quat.create();
        quat.slerp(currentRotation, startRotation, targetRotation, easedProgress);
        this.transform.setRotation(currentRotation);
        
        if (progress < 1.0) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }

  public scaleTo(targetScale: vec3, duration: number, easing?: (t: number) => number): Promise<void> {
    return new Promise((resolve) => {
      const startScale = this.transform.getScale();
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        const easedProgress = easing ? easing(progress) : progress;
        
        const currentScale = vec3.create();
        vec3.lerp(currentScale, startScale, targetScale, easedProgress);
        this.transform.setScale(currentScale);
        
        if (progress < 1.0) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }

  // Serialization
  public toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      transform: this.transform.toJSON(),
      visible: this.visible,
      castShadows: this.castShadows,
      receiveShadows: this.receiveShadows,
      frustumCulled: this.frustumCulled,
      renderOrder: this.renderOrder,
      userData: this.userData,
      components: Array.from(this.components.entries()).map(([name, component]) => ({
        name,
        data: component.toJSON()
      })),
      children: this.children.map(child => child.toJSON())
    };
  }

  public fromJSON(data: any): void {
    this.id = data.id || this.id;
    this.name = data.name || this.name;
    
    if (data.transform) {
      this.transform.fromJSON(data.transform);
    }
    
    this.visible = data.visible !== undefined ? data.visible : true;
    this.castShadows = data.castShadows !== undefined ? data.castShadows : true;
    this.receiveShadows = data.receiveShadows !== undefined ? data.receiveShadows : true;
    this.frustumCulled = data.frustumCulled !== undefined ? data.frustumCulled : true;
    this.renderOrder = data.renderOrder || 0;
    this.userData = data.userData || {};
    
    // Note: Components and children would need special handling
    // This would require a component factory and recursive creation
  }

  // Cleanup
  public destroy(): void {
    // Remove from parent
    if (this.parent) {
      this.parent.removeChild(this);
    }
    
    // Destroy children
    for (const child of [...this.children]) {
      child.destroy();
    }
    
    // Cleanup components
    for (const component of this.components.values()) {
      component.onDetach();
    }
    this.components.clear();
    
    // Clear callbacks
    this.updateCallbacks.length = 0;
    this.renderCallbacks.length = 0;
    
    // Clear references
    this.mesh = null;
    this.material = null;
    this.parent = null;
    this.children.length = 0;
  }

  // Debug methods
  public toString(): string {
    return `GameObject: ${this.name} (${this.id})
      Transform: ${this.transform.toString()}
      Visible: ${this.visible}
      Components: ${Array.from(this.components.keys()).join(', ')}
      Children: ${this.children.length}`;
  }

  public debugHierarchy(indent: number = 0): string {
    const prefix = '  '.repeat(indent);
    let result = `${prefix}${this.name} (${this.id})\n`;
    
    for (const child of this.children) {
      result += child.debugHierarchy(indent + 1);
    }
    
    return result;
  }
}