/**
 * Scene Graph System
 * Hierarchical scene management with spatial optimization
 */

import { GameObject } from './GameObject';
import { Camera } from './Camera';
import { vec3 } from 'gl-matrix';

export interface SceneNode {
  gameObject: GameObject;
  parent: SceneNode | null;
  children: SceneNode[];
  depth: number;
  worldBounds: {
    center: vec3;
    radius: number;
  };
  visible: boolean;
  lastCulled: number;
}

export class SceneGraph {
  private rootNode: SceneNode | null = null;
  private nodeMap: Map<string, SceneNode> = new Map();
  private visibleNodes: SceneNode[] = [];
  private frustumCulledNodes: SceneNode[] = [];
  
  private lastCullFrame: number = 0;
  private cullCounter: number = 0;

  public addNode(gameObject: GameObject, parent?: GameObject): SceneNode {
    const node: SceneNode = {
      gameObject,
      parent: null,
      children: [],
      depth: 0,
      worldBounds: {
        center: gameObject.getBoundingCenter(),
        radius: gameObject.getBoundingRadius()
      },
      visible: true,
      lastCulled: 0
    };

    // Find parent node
    if (parent) {
      const parentNode = this.nodeMap.get(parent.getId());
      if (parentNode) {
        node.parent = parentNode;
        node.depth = parentNode.depth + 1;
        parentNode.children.push(node);
      }
    }

    if (!parent || !node.parent) {
      // This is a root node
      if (!this.rootNode) {
        this.rootNode = node;
      } else {
        // Add as child of root
        node.parent = this.rootNode;
        node.depth = 1;
        this.rootNode.children.push(node);
      }
    }

    this.nodeMap.set(gameObject.getId(), node);
    this.updateNodeBounds(node);
    
    return node;
  }

  public removeNode(gameObject: GameObject): boolean {
    const node = this.nodeMap.get(gameObject.getId());
    if (!node) return false;

    // Remove from parent's children
    if (node.parent) {
      const index = node.parent.children.indexOf(node);
      if (index !== -1) {
        node.parent.children.splice(index, 1);
      }
    }

    // Reparent children to this node's parent
    for (const child of node.children) {
      child.parent = node.parent;
      child.depth = node.depth;
      
      if (node.parent) {
        node.parent.children.push(child);
      } else {
        // Child becomes a root node
        if (this.rootNode === node) {
          this.rootNode = child;
        }
      }
    }

    // Update depths
    this.updateDepths(node.parent);

    this.nodeMap.delete(gameObject.getId());
    return true;
  }

  public getNode(gameObject: GameObject): SceneNode | null {
    return this.nodeMap.get(gameObject.getId()) || null;
  }

  public getRootNode(): SceneNode | null {
    return this.rootNode;
  }

  public getAllNodes(): SceneNode[] {
    return Array.from(this.nodeMap.values());
  }

  private updateDepths(node: SceneNode | null): void {
    if (!node) return;

    for (const child of node.children) {
      child.depth = node.depth + 1;
      this.updateDepths(child);
    }
  }

  private updateNodeBounds(node: SceneNode): void {
    const gameObject = node.gameObject;
    node.worldBounds.center = gameObject.getBoundingCenter();
    node.worldBounds.radius = gameObject.getBoundingRadius();

    // Recursively update parent bounds
    this.updateParentBounds(node.parent);
  }

  private updateParentBounds(node: SceneNode | null): void {
    if (!node) return;

    // Recalculate bounds to encompass all children
    if (node.children.length > 0) {
      const minBounds = vec3.create();
      const maxBounds = vec3.create();
      let first = true;

      for (const child of node.children) {
        const childCenter = child.worldBounds.center;
        const childRadius = child.worldBounds.radius;

        const childMin = vec3.create();
        const childMax = vec3.create();
        vec3.set(childMin, 
          childCenter[0] - childRadius,
          childCenter[1] - childRadius,
          childCenter[2] - childRadius
        );
        vec3.set(childMax, 
          childCenter[0] + childRadius,
          childCenter[1] + childRadius,
          childCenter[2] + childRadius
        );

        if (first) {
          vec3.copy(minBounds, childMin);
          vec3.copy(maxBounds, childMax);
          first = false;
        } else {
          vec3.min(minBounds, minBounds, childMin);
          vec3.max(maxBounds, maxBounds, childMax);
        }
      }

      // Calculate new center and radius
      vec3.add(node.worldBounds.center, minBounds, maxBounds);
      vec3.scale(node.worldBounds.center, node.worldBounds.center, 0.5);

      const size = vec3.create();
      vec3.subtract(size, maxBounds, minBounds);
      node.worldBounds.radius = vec3.length(size) * 0.5;
    }

    // Continue up the hierarchy
    this.updateParentBounds(node.parent);
  }

  public performFrustumCulling(camera: Camera): SceneNode[] {
    this.cullCounter++;
    this.visibleNodes.length = 0;
    this.frustumCulledNodes.length = 0;

    if (this.rootNode) {
      this.cullNodeRecursive(this.rootNode, camera);
    }

    this.lastCullFrame = this.cullCounter;
    return this.visibleNodes;
  }

  private cullNodeRecursive(node: SceneNode, camera: Camera): void {
    const gameObject = node.gameObject;
    
    // Skip if not visible
    if (!gameObject.isVisible()) {
      node.visible = false;
      return;
    }

    // Perform frustum culling if enabled
    let inFrustum = true;
    if (gameObject.getFrustumCulled()) {
      inFrustum = camera.isSphereInFrustum(
        node.worldBounds.center,
        node.worldBounds.radius
      );
    }

    if (inFrustum) {
      node.visible = true;
      node.lastCulled = this.cullCounter;
      this.visibleNodes.push(node);

      // Recursively cull children
      for (const child of node.children) {
        this.cullNodeRecursive(child, camera);
      }
    } else {
      node.visible = false;
      this.frustumCulledNodes.push(node);
      
      // Mark all children as culled too
      this.markChildrenCulled(node);
    }
  }

  private markChildrenCulled(node: SceneNode): void {
    for (const child of node.children) {
      child.visible = false;
      this.markChildrenCulled(child);
    }
  }

  public getVisibleNodes(): SceneNode[] {
    return this.visibleNodes;
  }

  public getFrustumCulledNodes(): SceneNode[] {
    return this.frustumCulledNodes;
  }

  public sortNodesByDepth(): void {
    this.visibleNodes.sort((a, b) => {
      const renderOrderA = a.gameObject.getRenderOrder();
      const renderOrderB = b.gameObject.getRenderOrder();
      
      if (renderOrderA !== renderOrderB) {
        return renderOrderA - renderOrderB;
      }
      
      return a.depth - b.depth;
    });
  }

  public sortNodesByDistance(cameraPosition: vec3, reverse: boolean = false): void {
    this.visibleNodes.sort((a, b) => {
      const distA = vec3.distance(cameraPosition, a.worldBounds.center);
      const distB = vec3.distance(cameraPosition, b.worldBounds.center);
      
      return reverse ? distB - distA : distA - distB;
    });
  }

  public update(deltaTime: number): void {
    // Update all node bounds
    for (const node of this.nodeMap.values()) {
      this.updateNodeBounds(node);
    }
  }

  public traverse(callback: (node: SceneNode) => void, startNode?: SceneNode): void {
    const start = startNode || this.rootNode;
    if (!start) return;

    callback(start);
    
    for (const child of start.children) {
      this.traverse(callback, child);
    }
  }

  public findNodesByName(name: string): SceneNode[] {
    const results: SceneNode[] = [];
    
    this.traverse((node) => {
      if (node.gameObject.getName() === name) {
        results.push(node);
      }
    });
    
    return results;
  }

  public findNodesByTag(tag: string): SceneNode[] {
    const results: SceneNode[] = [];
    
    this.traverse((node) => {
      const userData = node.gameObject.getUserData();
      if (userData.tag === tag) {
        results.push(node);
      }
    });
    
    return results;
  }

  public findNodesInRadius(center: vec3, radius: number): SceneNode[] {
    const results: SceneNode[] = [];
    
    this.traverse((node) => {
      const distance = vec3.distance(center, node.worldBounds.center);
      if (distance <= radius + node.worldBounds.radius) {
        results.push(node);
      }
    });
    
    return results;
  }

  public getStats(): {
    totalNodes: number;
    visibleNodes: number;
    culledNodes: number;
    averageDepth: number;
    maxDepth: number;
  } {
    let totalDepth = 0;
    let maxDepth = 0;
    
    for (const node of this.nodeMap.values()) {
      totalDepth += node.depth;
      maxDepth = Math.max(maxDepth, node.depth);
    }
    
    return {
      totalNodes: this.nodeMap.size,
      visibleNodes: this.visibleNodes.length,
      culledNodes: this.frustumCulledNodes.length,
      averageDepth: this.nodeMap.size > 0 ? totalDepth / this.nodeMap.size : 0,
      maxDepth
    };
  }

  public clear(): void {
    this.rootNode = null;
    this.nodeMap.clear();
    this.visibleNodes.length = 0;
    this.frustumCulledNodes.length = 0;
  }

  public debugPrint(): string {
    let result = 'Scene Graph:\n';
    
    if (this.rootNode) {
      result += this.debugPrintNode(this.rootNode, 0);
    }
    
    return result;
  }

  private debugPrintNode(node: SceneNode, indent: number): string {
    const prefix = '  '.repeat(indent);
    let result = `${prefix}${node.gameObject.getName()} (depth: ${node.depth}, visible: ${node.visible})\n`;
    
    for (const child of node.children) {
      result += this.debugPrintNode(child, indent + 1);
    }
    
    return result;
  }
}