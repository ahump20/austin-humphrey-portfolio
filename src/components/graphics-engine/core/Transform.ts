/**
 * Transform System
 * Handles position, rotation, and scale transformations
 */

import { mat4, vec3, quat } from 'gl-matrix';

export class Transform {
  private position: vec3 = vec3.create();
  private rotation: quat = quat.create();
  private scale: vec3 = vec3.fromValues(1, 1, 1);
  
  private localMatrix: mat4 = mat4.create();
  private worldMatrix: mat4 = mat4.create();
  
  private parent: Transform | null = null;
  private children: Transform[] = [];
  
  private isDirty: boolean = true;
  private isWorldDirty: boolean = true;

  constructor() {
    quat.identity(this.rotation);
    this.updateLocalMatrix();
  }

  // Position methods
  public setPosition(x: number | vec3, y?: number, z?: number): void {
    if (typeof x === 'number' && y !== undefined && z !== undefined) {
      vec3.set(this.position, x, y, z);
    } else if (x instanceof Float32Array || Array.isArray(x)) {
      vec3.copy(this.position, x as vec3);
    }
    this.markDirty();
  }

  public getPosition(): vec3 {
    return vec3.clone(this.position);
  }

  public getWorldPosition(): vec3 {
    this.updateWorldMatrix();
    const worldPos = vec3.create();
    mat4.getTranslation(worldPos, this.worldMatrix);
    return worldPos;
  }

  public translate(x: number | vec3, y?: number, z?: number): void {
    const translation = vec3.create();
    if (typeof x === 'number' && y !== undefined && z !== undefined) {
      vec3.set(translation, x, y, z);
    } else if (x instanceof Float32Array || Array.isArray(x)) {
      vec3.copy(translation, x as vec3);
    }
    vec3.add(this.position, this.position, translation);
    this.markDirty();
  }

  // Rotation methods
  public setRotation(x: number | quat, y?: number, z?: number, w?: number): void {
    if (typeof x === 'number' && y !== undefined && z !== undefined && w !== undefined) {
      quat.set(this.rotation, x, y, z, w);
    } else if (x instanceof Float32Array || Array.isArray(x)) {
      quat.copy(this.rotation, x as quat);
    }
    this.markDirty();
  }

  public setRotationFromEuler(x: number, y: number, z: number): void {
    quat.fromEuler(this.rotation, x, y, z);
    this.markDirty();
  }

  public setRotationFromAxisAngle(axis: vec3, angle: number): void {
    quat.setAxisAngle(this.rotation, axis, angle);
    this.markDirty();
  }

  public getRotation(): quat {
    return quat.clone(this.rotation);
  }

  public getWorldRotation(): quat {
    this.updateWorldMatrix();
    const worldRot = quat.create();
    mat4.getRotation(worldRot, this.worldMatrix);
    return worldRot;
  }

  public getEulerAngles(): vec3 {
    const euler = vec3.create();
    const test = this.rotation[0] * this.rotation[1] + this.rotation[2] * this.rotation[3];
    
    if (test > 0.499) { // singularity at north pole
      euler[1] = 2 * Math.atan2(this.rotation[0], this.rotation[3]);
      euler[2] = Math.PI / 2;
      euler[0] = 0;
      return euler;
    }
    
    if (test < -0.499) { // singularity at south pole
      euler[1] = -2 * Math.atan2(this.rotation[0], this.rotation[3]);
      euler[2] = -Math.PI / 2;
      euler[0] = 0;
      return euler;
    }
    
    const sqx = this.rotation[0] * this.rotation[0];
    const sqy = this.rotation[1] * this.rotation[1];
    const sqz = this.rotation[2] * this.rotation[2];
    
    euler[1] = Math.atan2(2 * this.rotation[1] * this.rotation[3] - 2 * this.rotation[0] * this.rotation[2], 1 - 2 * sqy - 2 * sqz);
    euler[2] = Math.asin(2 * test);
    euler[0] = Math.atan2(2 * this.rotation[0] * this.rotation[3] - 2 * this.rotation[1] * this.rotation[2], 1 - 2 * sqx - 2 * sqz);
    
    // Convert to degrees
    vec3.scale(euler, euler, 180 / Math.PI);
    
    return euler;
  }

  public rotate(x: number | quat, y?: number, z?: number, w?: number): void {
    const deltaRotation = quat.create();
    if (typeof x === 'number' && y !== undefined && z !== undefined && w !== undefined) {
      quat.set(deltaRotation, x, y, z, w);
    } else if (x instanceof Float32Array || Array.isArray(x)) {
      quat.copy(deltaRotation, x as quat);
    }
    quat.multiply(this.rotation, this.rotation, deltaRotation);
    this.markDirty();
  }

  public rotateEuler(x: number, y: number, z: number): void {
    const deltaRotation = quat.create();
    quat.fromEuler(deltaRotation, x, y, z);
    quat.multiply(this.rotation, this.rotation, deltaRotation);
    this.markDirty();
  }

  public rotateX(angle: number): void {
    const deltaRotation = quat.create();
    quat.rotateX(deltaRotation, deltaRotation, angle);
    quat.multiply(this.rotation, this.rotation, deltaRotation);
    this.markDirty();
  }

  public rotateY(angle: number): void {
    const deltaRotation = quat.create();
    quat.rotateY(deltaRotation, deltaRotation, angle);
    quat.multiply(this.rotation, this.rotation, deltaRotation);
    this.markDirty();
  }

  public rotateZ(angle: number): void {
    const deltaRotation = quat.create();
    quat.rotateZ(deltaRotation, deltaRotation, angle);
    quat.multiply(this.rotation, this.rotation, deltaRotation);
    this.markDirty();
  }

  // Scale methods
  public setScale(x: number | vec3, y?: number, z?: number): void {
    if (typeof x === 'number') {
      if (y !== undefined && z !== undefined) {
        vec3.set(this.scale, x, y, z);
      } else {
        vec3.set(this.scale, x, x, x);
      }
    } else if (x instanceof Float32Array || Array.isArray(x)) {
      vec3.copy(this.scale, x as vec3);
    }
    this.markDirty();
  }

  public getScale(): vec3 {
    return vec3.clone(this.scale);
  }

  public getWorldScale(): vec3 {
    this.updateWorldMatrix();
    const worldScale = vec3.create();
    mat4.getScaling(worldScale, this.worldMatrix);
    return worldScale;
  }

  public scaleBy(x: number | vec3, y?: number, z?: number): void {
    const scaleVec = vec3.create();
    if (typeof x === 'number') {
      if (y !== undefined && z !== undefined) {
        vec3.set(scaleVec, x, y, z);
      } else {
        vec3.set(scaleVec, x, x, x);
      }
    } else if (x instanceof Float32Array || Array.isArray(x)) {
      vec3.copy(scaleVec, x as vec3);
    }
    vec3.multiply(this.scale, this.scale, scaleVec);
    this.markDirty();
  }

  // Matrix methods
  public getLocalMatrix(): mat4 {
    this.updateLocalMatrix();
    return mat4.clone(this.localMatrix);
  }

  public getWorldMatrix(): mat4 {
    this.updateWorldMatrix();
    return mat4.clone(this.worldMatrix);
  }

  private updateLocalMatrix(): void {
    if (!this.isDirty) return;
    
    // Compose TRS matrix
    mat4.fromRotationTranslationScale(this.localMatrix, this.rotation, this.position, this.scale);
    this.isDirty = false;
    this.markWorldDirty();
  }

  private updateWorldMatrix(): void {
    this.updateLocalMatrix();
    
    if (!this.isWorldDirty) return;
    
    if (this.parent) {
      const parentWorldMatrix = this.parent.getWorldMatrix();
      mat4.multiply(this.worldMatrix, parentWorldMatrix, this.localMatrix);
    } else {
      mat4.copy(this.worldMatrix, this.localMatrix);
    }
    
    this.isWorldDirty = false;
  }

  private markDirty(): void {
    this.isDirty = true;
    this.markWorldDirty();
  }

  private markWorldDirty(): void {
    this.isWorldDirty = true;
    
    // Mark all children as world dirty
    for (const child of this.children) {
      child.markWorldDirty();
    }
  }

  // Hierarchy methods
  public setParent(parent: Transform | null): void {
    if (this.parent === parent) return;
    
    // Remove from old parent
    if (this.parent) {
      const index = this.parent.children.indexOf(this);
      if (index !== -1) {
        this.parent.children.splice(index, 1);
      }
    }
    
    // Add to new parent
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
    
    this.markWorldDirty();
  }

  public getParent(): Transform | null {
    return this.parent;
  }

  public getChildren(): Transform[] {
    return [...this.children];
  }

  public addChild(child: Transform): void {
    child.setParent(this);
  }

  public removeChild(child: Transform): void {
    child.setParent(null);
  }

  public getChildCount(): number {
    return this.children.length;
  }

  // Utility methods
  public lookAt(target: vec3, up: vec3 = vec3.fromValues(0, 1, 0)): void {
    const forward = vec3.create();
    vec3.subtract(forward, target, this.position);
    vec3.normalize(forward, forward);
    
    const right = vec3.create();
    vec3.cross(right, forward, up);
    vec3.normalize(right, right);
    
    const actualUp = vec3.create();
    vec3.cross(actualUp, right, forward);
    vec3.normalize(actualUp, actualUp);
    
    // Create rotation matrix
    const rotMatrix = mat4.create();
    rotMatrix[0] = right[0];
    rotMatrix[1] = right[1];
    rotMatrix[2] = right[2];
    rotMatrix[4] = actualUp[0];
    rotMatrix[5] = actualUp[1];
    rotMatrix[6] = actualUp[2];
    rotMatrix[8] = -forward[0];
    rotMatrix[9] = -forward[1];
    rotMatrix[10] = -forward[2];
    
    // Extract quaternion from matrix
    mat4.getRotation(this.rotation, rotMatrix);
    this.markDirty();
  }

  public getForward(): vec3 {
    const forward = vec3.fromValues(0, 0, -1);
    vec3.transformQuat(forward, forward, this.rotation);
    return forward;
  }

  public getRight(): vec3 {
    const right = vec3.fromValues(1, 0, 0);
    vec3.transformQuat(right, right, this.rotation);
    return right;
  }

  public getUp(): vec3 {
    const up = vec3.fromValues(0, 1, 0);
    vec3.transformQuat(up, up, this.rotation);
    return up;
  }

  public transformPoint(point: vec3): vec3 {
    const result = vec3.create();
    vec3.transformMat4(result, point, this.getWorldMatrix());
    return result;
  }

  public transformDirection(direction: vec3): vec3 {
    const result = vec3.create();
    vec3.transformQuat(result, direction, this.getWorldRotation());
    return result;
  }

  public inverseTransformPoint(point: vec3): vec3 {
    const inverseMatrix = mat4.create();
    mat4.invert(inverseMatrix, this.getWorldMatrix());
    
    const result = vec3.create();
    vec3.transformMat4(result, point, inverseMatrix);
    return result;
  }

  public inverseTransformDirection(direction: vec3): vec3 {
    const inverseRotation = quat.create();
    quat.invert(inverseRotation, this.getWorldRotation());
    
    const result = vec3.create();
    vec3.transformQuat(result, direction, inverseRotation);
    return result;
  }

  // Interpolation methods
  public lerp(other: Transform, t: number): void {
    vec3.lerp(this.position, this.position, other.position, t);
    quat.slerp(this.rotation, this.rotation, other.rotation, t);
    vec3.lerp(this.scale, this.scale, other.scale, t);
    this.markDirty();
  }

  public lerpTo(targetTransform: Transform, t: number): Transform {
    const result = new Transform();
    vec3.lerp(result.position, this.position, targetTransform.position, t);
    quat.slerp(result.rotation, this.rotation, targetTransform.rotation, t);
    vec3.lerp(result.scale, this.scale, targetTransform.scale, t);
    result.markDirty();
    return result;
  }

  // Copy methods
  public copy(other: Transform): void {
    vec3.copy(this.position, other.position);
    quat.copy(this.rotation, other.rotation);
    vec3.copy(this.scale, other.scale);
    this.markDirty();
  }

  public clone(): Transform {
    const result = new Transform();
    result.copy(this);
    return result;
  }

  // Reset methods
  public reset(): void {
    vec3.set(this.position, 0, 0, 0);
    quat.identity(this.rotation);
    vec3.set(this.scale, 1, 1, 1);
    this.markDirty();
  }

  public resetPosition(): void {
    vec3.set(this.position, 0, 0, 0);
    this.markDirty();
  }

  public resetRotation(): void {
    quat.identity(this.rotation);
    this.markDirty();
  }

  public resetScale(): void {
    vec3.set(this.scale, 1, 1, 1);
    this.markDirty();
  }

  // Serialization
  public toJSON(): any {
    return {
      position: Array.from(this.position),
      rotation: Array.from(this.rotation),
      scale: Array.from(this.scale)
    };
  }

  public fromJSON(data: any): void {
    if (data.position) {
      vec3.set(this.position, data.position[0], data.position[1], data.position[2]);
    }
    if (data.rotation) {
      quat.set(this.rotation, data.rotation[0], data.rotation[1], data.rotation[2], data.rotation[3]);
    }
    if (data.scale) {
      vec3.set(this.scale, data.scale[0], data.scale[1], data.scale[2]);
    }
    this.markDirty();
  }

  // Debug methods
  public toString(): string {
    const pos = this.position;
    const euler = this.getEulerAngles();
    const scale = this.scale;
    
    return `Transform: 
      Position: (${pos[0].toFixed(2)}, ${pos[1].toFixed(2)}, ${pos[2].toFixed(2)})
      Rotation: (${euler[0].toFixed(2)}°, ${euler[1].toFixed(2)}°, ${euler[2].toFixed(2)}°)
      Scale: (${scale[0].toFixed(2)}, ${scale[1].toFixed(2)}, ${scale[2].toFixed(2)})`;
  }
}