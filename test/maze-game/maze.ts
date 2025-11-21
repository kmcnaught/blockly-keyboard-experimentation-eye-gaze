/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Simple maze game engine.
 */

enum Direction {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
}

enum SquareType {
  WALL = 0,
  OPEN = 1,
  START = 2,
  FINISH = 3,
}

interface Position {
  x: number;
  y: number;
}

/**
 * Simple maze layouts by level.
 */
const MAZES = [
  // Level 1: Simple straight path
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 3, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 2: Single turn
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 3, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 3: Multiple turns
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 3, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 4: S-curve
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 3, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 5: T-junction with conditional
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 3, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 6: Zigzag path
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 3, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 7: Multiple decision points
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 3, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 8: Complex maze requiring loop
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 0, 1, 1, 0, 0],
    [0, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 3, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
];

export class MazeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: number;
  private maze: number[][];
  private playerPos: Position;
  private playerDir: Direction;
  private startPos: Position;
  private finishPos: Position;
  private squareSize = 50;
  private executing = false;
  private commandQueue: Array<() => void> = [];
  private pegmanImage: HTMLImageElement | null = null;
  private markerImage: HTMLImageElement | null = null;
  private imagesLoaded = false;

  constructor(canvasId: string, level: number) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element ${canvasId} not found`);
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    this.ctx = ctx;
    this.level = Math.min(Math.max(level, 1), MAZES.length) - 1;
    this.maze = MAZES[this.level];

    // Find start and finish positions
    this.startPos = {x: 0, y: 0};
    this.finishPos = {x: 0, y: 0};
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        if (this.maze[y][x] === SquareType.START) {
          this.startPos = {x, y};
        } else if (this.maze[y][x] === SquareType.FINISH) {
          this.finishPos = {x, y};
        }
      }
    }

    this.playerPos = {...this.startPos};
    this.playerDir = Direction.EAST;

    this.loadImages();
  }

  private loadImages(): void {
    let imagesLoadedCount = 0;
    const totalImages = 2;

    const onImageLoad = () => {
      imagesLoadedCount++;
      if (imagesLoadedCount === totalImages) {
        this.imagesLoaded = true;
        this.draw();
      }
    };

    // Load pegman image
    this.pegmanImage = new Image();
    this.pegmanImage.onload = onImageLoad;
    this.pegmanImage.src = 'assets/pegman.png';

    // Load marker image
    this.markerImage = new Image();
    this.markerImage.onload = onImageLoad;
    this.markerImage.src = 'assets/marker.png';

    // Draw placeholder while loading
    this.draw();
  }

  public static getMaxLevel(): number {
    return MAZES.length;
  }

  public setLevel(level: number): void {
    this.level = Math.min(Math.max(level, 1), MAZES.length) - 1;
    this.maze = MAZES[this.level];

    // Find start and finish positions
    this.startPos = {x: 0, y: 0};
    this.finishPos = {x: 0, y: 0};
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        if (this.maze[y][x] === SquareType.START) {
          this.startPos = {x, y};
        } else if (this.maze[y][x] === SquareType.FINISH) {
          this.finishPos = {x, y};
        }
      }
    }

    this.reset();
  }

  public getLevel(): number {
    return this.level + 1;
  }

  private draw() {
    const width = this.maze[0].length * this.squareSize;
    const height = this.maze.length * this.squareSize;
    this.canvas.width = width;
    this.canvas.height = height;

    // Clear canvas with light background
    this.ctx.fillStyle = '#F1EEE7';
    this.ctx.fillRect(0, 0, width, height);

    // Draw outer border
    this.ctx.strokeStyle = '#CCB';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, width, height);

    // Draw maze - only render path tiles (not walls)
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        const square = this.maze[y][x];
        const px = x * this.squareSize;
        const py = y * this.squareSize;

        // Only draw non-wall tiles
        if (square !== SquareType.WALL) {
          // Draw path tiles with bright yellow highlight
          this.ctx.fillStyle = '#FFE500';
          this.ctx.fillRect(px, py, this.squareSize, this.squareSize);

          // Add subtle darker border to separate tiles
          this.ctx.strokeStyle = '#D4C000';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(px, py, this.squareSize, this.squareSize);

          // Draw finish marker with image if loaded
          if (square === SquareType.FINISH && this.markerImage && this.imagesLoaded) {
            const markerWidth = 20;
            const markerHeight = 34;
            this.ctx.drawImage(
              this.markerImage,
              px + (this.squareSize - markerWidth) / 2,
              py + (this.squareSize - markerHeight) / 2 - 5,
              markerWidth,
              markerHeight
            );
          } else if (square === SquareType.FINISH) {
            // Fallback if image not loaded
            this.ctx.fillStyle = '#F44336';
            this.ctx.beginPath();
            this.ctx.arc(
              px + this.squareSize / 2,
              py + this.squareSize / 2,
              this.squareSize / 3,
              0,
              2 * Math.PI
            );
            this.ctx.fill();
          }
        }
      }
    }

    // Draw player with pegman image if loaded
    const px = this.playerPos.x * this.squareSize;
    const py = this.playerPos.y * this.squareSize;

    if (this.pegmanImage && this.imagesLoaded) {
      // Pegman sprite sheet is 1029x51 with 21 frames (49x51 each)
      // Frames 0-3: Facing North (different walking poses)
      // Frames 4-7: Facing East
      // Frames 8-11: Facing South
      // Frames 12-15: Facing West
      const PEGMAN_WIDTH = 49;
      const PEGMAN_HEIGHT = 51;

      // Map direction to frame number (use first frame of each direction)
      const directionToFrame = {
        [Direction.NORTH]: 0,
        [Direction.EAST]: 4,
        [Direction.SOUTH]: 8,
        [Direction.WEST]: 12,
      };

      const frameIndex = directionToFrame[this.playerDir];
      const srcX = frameIndex * PEGMAN_WIDTH;
      const srcY = 0;

      // Draw pegman at appropriate size
      const destWidth = PEGMAN_WIDTH;
      const destHeight = PEGMAN_HEIGHT;
      const destX = px + (this.squareSize - destWidth) / 2;
      const destY = py + (this.squareSize - destHeight) / 2;

      this.ctx.drawImage(
        this.pegmanImage,
        srcX,
        srcY,
        PEGMAN_WIDTH,
        PEGMAN_HEIGHT,
        destX,
        destY,
        destWidth,
        destHeight
      );
    } else {
      // Fallback rendering
      const centerX = px + this.squareSize / 2;
      const centerY = py + this.squareSize / 2;

      // Draw green base
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY + 10, this.squareSize / 5, 0, 2 * Math.PI);
      this.ctx.fill();

      // Draw player
      this.ctx.fillStyle = '#2196F3';
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, this.squareSize / 4, 0, 2 * Math.PI);
      this.ctx.fill();

      // Draw direction indicator
      this.ctx.strokeStyle = '#2196F3';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      const dirX = [0, 1, 0, -1][this.playerDir];
      const dirY = [-1, 0, 1, 0][this.playerDir];
      this.ctx.lineTo(
        centerX + dirX * (this.squareSize / 4 + 5),
        centerY + dirY * (this.squareSize / 4 + 5)
      );
      this.ctx.stroke();
    }
  }

  private isPathForward(): boolean {
    const dirX = [0, 1, 0, -1][this.playerDir];
    const dirY = [-1, 0, 1, 0][this.playerDir];
    const newX = this.playerPos.x + dirX;
    const newY = this.playerPos.y + dirY;
    return this.isValidPosition(newX, newY);
  }

  private isPathLeft(): boolean {
    const leftDir = (this.playerDir + 3) % 4;
    const dirX = [0, 1, 0, -1][leftDir];
    const dirY = [-1, 0, 1, 0][leftDir];
    const newX = this.playerPos.x + dirX;
    const newY = this.playerPos.y + dirY;
    return this.isValidPosition(newX, newY);
  }

  private isPathRight(): boolean {
    const rightDir = (this.playerDir + 1) % 4;
    const dirX = [0, 1, 0, -1][rightDir];
    const dirY = [-1, 0, 1, 0][rightDir];
    const newX = this.playerPos.x + dirX;
    const newY = this.playerPos.y + dirY;
    return this.isValidPosition(newX, newY);
  }

  private isValidPosition(x: number, y: number): boolean {
    if (x < 0 || x >= this.maze[0].length || y < 0 || y >= this.maze.length) {
      return false;
    }
    return this.maze[y][x] !== SquareType.WALL;
  }

  private moveForward(): void {
    this.commandQueue.push(() => {
      const dirX = [0, 1, 0, -1][this.playerDir];
      const dirY = [-1, 0, 1, 0][this.playerDir];
      const newX = this.playerPos.x + dirX;
      const newY = this.playerPos.y + dirY;

      if (!this.isValidPosition(newX, newY)) {
        alert('Crashed into wall!');
        return;
      }

      this.playerPos.x = newX;
      this.playerPos.y = newY;
      this.draw();
    });
  }

  private turnLeft(): void {
    this.commandQueue.push(() => {
      this.playerDir = ((this.playerDir + 3) % 4) as Direction;
      this.draw();
    });
  }

  private turnRight(): void {
    this.commandQueue.push(() => {
      this.playerDir = ((this.playerDir + 1) % 4) as Direction;
      this.draw();
    });
  }

  private notDone(): boolean {
    return (
      this.playerPos.x !== this.finishPos.x ||
      this.playerPos.y !== this.finishPos.y
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public reset() {
    this.playerPos = {...this.startPos};
    this.playerDir = Direction.EAST;
    this.executing = false;
    this.draw();
  }

  public execute(code: string) {
    if (this.executing) {
      alert('Already executing!');
      return;
    }

    this.executing = true;
    this.reset();
    this.commandQueue = [];

    // Create execution context - functions queue commands
    const context: any = {
      moveForward: (blockId?: string) => this.moveForward(),
      turnLeft: (blockId?: string) => this.turnLeft(),
      turnRight: (blockId?: string) => this.turnRight(),
      isPathForward: (blockId?: string) => this.isPathForward(),
      isPathLeft: (blockId?: string) => this.isPathLeft(),
      isPathRight: (blockId?: string) => this.isPathRight(),
      notDone: () => this.notDone(),
    };

    try {
      // Execute code to build command queue
      const params = Object.keys(context);
      const args = Object.values(context);
      const fn = new Function(...params, code);
      fn(...args);

      // Animate the command queue
      this.animateQueue();
    } catch (e) {
      console.error('Error executing code:', e);
      alert('Error executing code: ' + e);
      this.executing = false;
    }
  }

  private async animateQueue() {
    for (const command of this.commandQueue) {
      command();
      await this.delay(300);
    }

    this.executing = false;

    // Check if finished
    if (!this.notDone()) {
      alert('Success! You reached the goal!');
    } else {
      alert('Program finished, but you did not reach the goal.');
    }
  }
}
