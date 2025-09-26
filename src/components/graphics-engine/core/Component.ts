/**
 * Base Component System
 * Entity-Component-System architecture foundation
 */

import { GameObject } from './GameObject';

export abstract class Component {
  protected gameObject: GameObject | null = null;
  protected active: boolean = true;
  protected started: boolean = false;

  public setGameObject(gameObject: GameObject | null): void {
    this.gameObject = gameObject;
  }

  public getGameObject(): GameObject | null {
    return this.gameObject;
  }

  public isActive(): boolean {
    return this.active;
  }

  public setActive(active: boolean): void {
    this.active = active;
  }

  public isStarted(): boolean {
    return this.started;
  }

  // Lifecycle methods - override in derived classes
  public onAttach(): void {
    // Called when component is attached to a GameObject
  }

  public onDetach(): void {
    // Called when component is detached from a GameObject
  }

  public start(): void {
    // Called before the first update
    this.started = true;
  }

  public update(deltaTime: number): void {
    if (!this.started) {
      this.start();
    }
    // Override in derived classes
  }

  public render(): void {
    // Override in derived classes for custom rendering
  }

  public onDestroy(): void {
    // Called when component is destroyed
  }

  // Serialization support
  public toJSON(): any {
    return {
      active: this.active,
      started: this.started
    };
  }

  public fromJSON(data: any): void {
    this.active = data.active !== undefined ? data.active : true;
    this.started = data.started !== undefined ? data.started : false;
  }
}