/**
 * Advanced Camera System
 * Supports perspective, orthographic, and cinematic cameras
 */

import { mat4, vec3, quat } from 'gl-matrix';

export type CameraType = 'perspective' | 'orthographic';

export interface CameraConfig {
  type: CameraType;
  fov: number;
  aspect: number;
  near: number;
  far: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export class Camera {
  private position: vec3 = vec3.create();
  private rotation: quat = quat.create();
  private target: vec3 = vec3.create();
  private up: vec3 = vec3.fromValues(0, 1, 0);
  
  private viewMatrix: mat4 = mat4.create();
  private projectionMatrix: mat4 = mat4.create();
  private viewProjectionMatrix: mat4 = mat4.create();
  private inverseViewMatrix: mat4 = mat4.create();
  private inverseProjectionMatrix: mat4 = mat4.create();
  
  private config: CameraConfig;
  private isDirty: boolean = true;
  
  // Frustum planes for culling
  private frustumPlanes: Float32Array = new Float32Array(24); // 6 planes * 4 components (a,b,c,d)
  
  // Camera vectors
  private forward: vec3 = vec3.create();
  private right: vec3 = vec3.create();
  private worldUp: vec3 = vec3.fromValues(0, 1, 0);
  
  // Animation support
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private animationDuration: number = 0;
  private animationStartPosition: vec3 = vec3.create();
  private animationTargetPosition: vec3 = vec3.create();
  private animationStartRotation: quat = quat.create();
  private animationTargetRotation: quat = quat.create();
  private animationEasing: (t: number) => number = (t) => t;

  constructor(config?: Partial<CameraConfig>) {
    this.config = {
      type: 'perspective',
      fov: 75,
      aspect: 16 / 9,
      near: 0.1,
      far: 1000,
      ...config
    };
    
    this.updateProjectionMatrix();
    this.updateViewMatrix();
  }

  public setPosition(position: vec3 | [number, number, number]): void {
    if (Array.isArray(position)) {
      vec3.set(this.position, position[0], position[1], position[2]);
    } else {
      vec3.copy(this.position, position);
    }
    this.isDirty = true;
  }

  public getPosition(): vec3 {
    return vec3.clone(this.position);
  }

  public setRotation(rotation: quat | [number, number, number, number]): void {
    if (Array.isArray(rotation)) {
      quat.set(this.rotation, rotation[0], rotation[1], rotation[2], rotation[3]);
    } else {
      quat.copy(this.rotation, rotation);
    }
    this.isDirty = true;
  }

  public getRotation(): quat {
    return quat.clone(this.rotation);
  }

  public lookAt(target: vec3 | [number, number, number], up?: vec3): void {
    if (Array.isArray(target)) {
      vec3.set(this.target, target[0], target[1], target[2]);
    } else {
      vec3.copy(this.target, target);
    }
    
    if (up) {
      vec3.copy(this.up, up);
    }
    
    this.isDirty = true;
  }

  public setFOV(fov: number): void {
    this.config.fov = fov;
    this.updateProjectionMatrix();
  }

  public getFOV(): number {
    return this.config.fov;
  }

  public setAspectRatio(aspect: number): void {
    this.config.aspect = aspect;
    this.updateProjectionMatrix();
  }

  public setNearFar(near: number, far: number): void {
    this.config.near = near;
    this.config.far = far;
    this.updateProjectionMatrix();
  }

  public setOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number): void {
    this.config.type = 'orthographic';
    this.config.left = left;
    this.config.right = right;
    this.config.top = top;
    this.config.bottom = bottom;
    this.config.near = near;
    this.config.far = far;
    this.updateProjectionMatrix();
  }

  public setPerspective(fov: number, aspect: number, near: number, far: number): void {
    this.config.type = 'perspective';
    this.config.fov = fov;
    this.config.aspect = aspect;
    this.config.near = near;
    this.config.far = far;
    this.updateProjectionMatrix();
  }

  private updateProjectionMatrix(): void {
    if (this.config.type === 'perspective') {
      mat4.perspective(
        this.projectionMatrix,
        (this.config.fov * Math.PI) / 180,
        this.config.aspect,
        this.config.near,
        this.config.far
      );
    } else {
      mat4.ortho(
        this.projectionMatrix,
        this.config.left!,
        this.config.right!,
        this.config.bottom!,
        this.config.top!,
        this.config.near,
        this.config.far
      );
    }
    
    mat4.invert(this.inverseProjectionMatrix, this.projectionMatrix);
    this.updateFrustum();
  }

  private updateViewMatrix(): void {
    // Calculate forward vector
    vec3.subtract(this.forward, this.target, this.position);
    vec3.normalize(this.forward, this.forward);
    
    // Calculate right vector
    vec3.cross(this.right, this.forward, this.worldUp);
    vec3.normalize(this.right, this.right);
    
    // Calculate up vector
    vec3.cross(this.up, this.right, this.forward);
    vec3.normalize(this.up, this.up);
    
    // Update rotation quaternion from forward vector
    const yaw = Math.atan2(this.forward[0], this.forward[2]);
    const pitch = Math.asin(-this.forward[1]);
    quat.fromEuler(this.rotation, (pitch * 180) / Math.PI, (yaw * 180) / Math.PI, 0);
    
    // Create view matrix
    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
    mat4.invert(this.inverseViewMatrix, this.viewMatrix);
    
    // Update view-projection matrix
    mat4.multiply(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);
    
    this.updateFrustum();
  }

  private updateFrustum(): void {
    const vp = this.viewProjectionMatrix;
    
    // Extract frustum planes from view-projection matrix
    // Left plane
    this.frustumPlanes[0] = vp[3] + vp[0];
    this.frustumPlanes[1] = vp[7] + vp[4];
    this.frustumPlanes[2] = vp[11] + vp[8];
    this.frustumPlanes[3] = vp[15] + vp[12];
    
    // Right plane
    this.frustumPlanes[4] = vp[3] - vp[0];
    this.frustumPlanes[5] = vp[7] - vp[4];
    this.frustumPlanes[6] = vp[11] - vp[8];
    this.frustumPlanes[7] = vp[15] - vp[12];
    
    // Bottom plane
    this.frustumPlanes[8] = vp[3] + vp[1];
    this.frustumPlanes[9] = vp[7] + vp[5];
    this.frustumPlanes[10] = vp[11] + vp[9];
    this.frustumPlanes[11] = vp[15] + vp[13];
    
    // Top plane
    this.frustumPlanes[12] = vp[3] - vp[1];
    this.frustumPlanes[13] = vp[7] - vp[5];
    this.frustumPlanes[14] = vp[11] - vp[9];
    this.frustumPlanes[15] = vp[15] - vp[13];
    
    // Near plane
    this.frustumPlanes[16] = vp[3] + vp[2];
    this.frustumPlanes[17] = vp[7] + vp[6];
    this.frustumPlanes[18] = vp[11] + vp[10];
    this.frustumPlanes[19] = vp[15] + vp[14];
    
    // Far plane
    this.frustumPlanes[20] = vp[3] - vp[2];
    this.frustumPlanes[21] = vp[7] - vp[6];
    this.frustumPlanes[22] = vp[11] - vp[10];
    this.frustumPlanes[23] = vp[15] - vp[14];
    
    // Normalize planes
    for (let i = 0; i < 6; i++) {
      const offset = i * 4;
      const length = Math.sqrt(
        this.frustumPlanes[offset] * this.frustumPlanes[offset] +
        this.frustumPlanes[offset + 1] * this.frustumPlanes[offset + 1] +
        this.frustumPlanes[offset + 2] * this.frustumPlanes[offset + 2]
      );
      
      if (length > 0) {
        this.frustumPlanes[offset] /= length;
        this.frustumPlanes[offset + 1] /= length;
        this.frustumPlanes[offset + 2] /= length;
        this.frustumPlanes[offset + 3] /= length;
      }
    }
  }

  public update(deltaTime: number): void {
    if (this.isAnimating) {
      const currentTime = performance.now();
      const elapsed = currentTime - this.animationStartTime;
      const progress = Math.min(elapsed / this.animationDuration, 1.0);
      const easedProgress = this.animationEasing(progress);
      
      // Interpolate position
      vec3.lerp(this.position, this.animationStartPosition, this.animationTargetPosition, easedProgress);
      
      // Interpolate rotation
      quat.slerp(this.rotation, this.animationStartRotation, this.animationTargetRotation, easedProgress);
      
      this.isDirty = true;
      
      if (progress >= 1.0) {
        this.isAnimating = false;
      }
    }
    
    if (this.isDirty) {
      this.updateViewMatrix();
      this.isDirty = false;
    }
  }

  public animateTo(
    targetPosition: vec3,
    targetRotation: quat,
    duration: number,
    easing?: (t: number) => number
  ): void {
    vec3.copy(this.animationStartPosition, this.position);
    vec3.copy(this.animationTargetPosition, targetPosition);
    quat.copy(this.animationStartRotation, this.rotation);
    quat.copy(this.animationTargetRotation, targetRotation);
    
    this.animationDuration = duration;
    this.animationStartTime = performance.now();
    this.animationEasing = easing || ((t) => t);
    this.isAnimating = true;
  }

  public animateToLookAt(
    targetPosition: vec3,
    lookAtTarget: vec3,
    duration: number,
    easing?: (t: number) => number
  ): void {
    // Calculate target rotation from look-at
    const direction = vec3.create();
    vec3.subtract(direction, lookAtTarget, targetPosition);
    vec3.normalize(direction, direction);
    
    const yaw = Math.atan2(direction[0], direction[2]);
    const pitch = Math.asin(-direction[1]);
    
    const targetRotation = quat.create();
    quat.fromEuler(targetRotation, (pitch * 180) / Math.PI, (yaw * 180) / Math.PI, 0);
    
    this.animateTo(targetPosition, targetRotation, duration, easing);
  }

  // Frustum culling
  public isPointInFrustum(point: vec3): boolean {
    for (let i = 0; i < 6; i++) {
      const offset = i * 4;
      const distance = 
        this.frustumPlanes[offset] * point[0] +
        this.frustumPlanes[offset + 1] * point[1] +
        this.frustumPlanes[offset + 2] * point[2] +
        this.frustumPlanes[offset + 3];
      
      if (distance < 0) {
        return false;
      }
    }
    return true;
  }

  public isSphereInFrustum(center: vec3, radius: number): boolean {
    for (let i = 0; i < 6; i++) {
      const offset = i * 4;
      const distance = 
        this.frustumPlanes[offset] * center[0] +
        this.frustumPlanes[offset + 1] * center[1] +
        this.frustumPlanes[offset + 2] * center[2] +
        this.frustumPlanes[offset + 3];
      
      if (distance < -radius) {
        return false;
      }
    }
    return true;
  }

  public isBoxInFrustum(min: vec3, max: vec3): boolean {
    for (let i = 0; i < 6; i++) {
      const offset = i * 4;
      const nx = this.frustumPlanes[offset];
      const ny = this.frustumPlanes[offset + 1];
      const nz = this.frustumPlanes[offset + 2];
      const d = this.frustumPlanes[offset + 3];
      
      // Get positive vertex
      const px = nx > 0 ? max[0] : min[0];
      const py = ny > 0 ? max[1] : min[1];
      const pz = nz > 0 ? max[2] : min[2];
      
      if (nx * px + ny * py + nz * pz + d < 0) {
        return false;
      }
    }
    return true;
  }

  // Screen space conversion
  public worldToScreen(worldPos: vec3, screenWidth: number, screenHeight: number): vec3 {
    const clipPos = vec3.create();
    vec3.transformMat4(clipPos, worldPos, this.viewProjectionMatrix);
    
    const screenPos = vec3.create();
    screenPos[0] = (clipPos[0] / clipPos[2] + 1.0) * 0.5 * screenWidth;
    screenPos[1] = (1.0 - clipPos[1] / clipPos[2]) * 0.5 * screenHeight;
    screenPos[2] = clipPos[2];
    
    return screenPos;
  }

  public screenToWorld(screenPos: vec3, screenWidth: number, screenHeight: number): vec3 {
    const clipPos = vec3.create();
    clipPos[0] = (screenPos[0] / screenWidth) * 2.0 - 1.0;
    clipPos[1] = 1.0 - (screenPos[1] / screenHeight) * 2.0;
    clipPos[2] = screenPos[2];
    
    const worldPos = vec3.create();
    vec3.transformMat4(worldPos, clipPos, this.inverseViewMatrix);
    
    return worldPos;
  }

  // Ray casting
  public screenToRay(screenX: number, screenY: number, screenWidth: number, screenHeight: number): { origin: vec3; direction: vec3 } {
    const x = (2.0 * screenX) / screenWidth - 1.0;
    const y = 1.0 - (2.0 * screenY) / screenHeight;
    
    const rayClip = vec3.fromValues(x, y, -1.0);
    
    const rayEye = vec3.create();
    vec3.transformMat4(rayEye, rayClip, this.inverseProjectionMatrix);
    rayEye[2] = -1.0;
    
    const rayWorld = vec3.create();
    vec3.transformMat4(rayWorld, rayEye, this.inverseViewMatrix);
    vec3.subtract(rayWorld, rayWorld, this.position);
    vec3.normalize(rayWorld, rayWorld);
    
    return {
      origin: vec3.clone(this.position),
      direction: rayWorld
    };
  }

  // Movement controls
  public moveForward(distance: number): void {
    const translation = vec3.create();
    vec3.scale(translation, this.forward, distance);
    vec3.add(this.position, this.position, translation);
    vec3.add(this.target, this.target, translation);
    this.isDirty = true;
  }

  public moveRight(distance: number): void {
    const translation = vec3.create();
    vec3.scale(translation, this.right, distance);
    vec3.add(this.position, this.position, translation);
    vec3.add(this.target, this.target, translation);
    this.isDirty = true;
  }

  public moveUp(distance: number): void {
    const translation = vec3.create();
    vec3.scale(translation, this.up, distance);
    vec3.add(this.position, this.position, translation);
    vec3.add(this.target, this.target, translation);
    this.isDirty = true;
  }

  public rotate(yaw: number, pitch: number, roll: number = 0): void {
    const deltaRotation = quat.create();
    quat.fromEuler(deltaRotation, pitch, yaw, roll);
    quat.multiply(this.rotation, this.rotation, deltaRotation);
    
    // Update target based on new rotation
    vec3.add(this.target, this.position, this.forward);
    this.isDirty = true;
  }

  public orbit(center: vec3, yaw: number, pitch: number, distance?: number): void {
    if (distance === undefined) {
      distance = vec3.distance(this.position, center);
    }
    
    const spherical = {
      radius: distance,
      phi: Math.acos(Math.max(-1, Math.min(1, (this.position[1] - center[1]) / distance))),
      theta: Math.atan2(this.position[0] - center[0], this.position[2] - center[2])
    };
    
    spherical.theta += yaw;
    spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi + pitch));
    
    this.position[0] = center[0] + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    this.position[1] = center[1] + spherical.radius * Math.cos(spherical.phi);
    this.position[2] = center[2] + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    
    this.lookAt(center);
  }

  // Getters
  public getViewMatrix(): mat4 {
    return mat4.clone(this.viewMatrix);
  }

  public getProjectionMatrix(): mat4 {
    return mat4.clone(this.projectionMatrix);
  }

  public getViewProjectionMatrix(): mat4 {
    return mat4.clone(this.viewProjectionMatrix);
  }

  public getInverseViewMatrix(): mat4 {
    return mat4.clone(this.inverseViewMatrix);
  }

  public getInverseProjectionMatrix(): mat4 {
    return mat4.clone(this.inverseProjectionMatrix);
  }

  public getForward(): vec3 {
    return vec3.clone(this.forward);
  }

  public getRight(): vec3 {
    return vec3.clone(this.right);
  }

  public getUp(): vec3 {
    return vec3.clone(this.up);
  }

  public getFrustumPlanes(): Float32Array {
    return new Float32Array(this.frustumPlanes);
  }

  public isAnimating(): boolean {
    return this.isAnimating;
  }
}