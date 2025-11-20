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
    this.level = Math.min(level, MAZES.length) - 1;
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

    this.draw();
  }

  private draw() {
    const width = this.maze[0].length * this.squareSize;
    const height = this.maze.length * this.squareSize;
    this.canvas.width = width;
    this.canvas.height = height;

    // Clear canvas
    this.ctx.fillStyle = '#F1EEE7';
    this.ctx.fillRect(0, 0, width, height);

    // Draw maze
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        const square = this.maze[y][x];
        const px = x * this.squareSize;
        const py = y * this.squareSize;

        if (square === SquareType.WALL) {
          this.ctx.fillStyle = '#666';
          this.ctx.fillRect(px, py, this.squareSize, this.squareSize);
        } else {
          // Draw path
          this.ctx.strokeStyle = '#CCB';
          this.ctx.strokeRect(px, py, this.squareSize, this.squareSize);

          // Draw finish marker
          if (square === SquareType.FINISH) {
            this.ctx.fillStyle = '#4CAF50';
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

    // Draw player
    const px = this.playerPos.x * this.squareSize + this.squareSize / 2;
    const py = this.playerPos.y * this.squareSize + this.squareSize / 2;

    this.ctx.fillStyle = '#2196F3';
    this.ctx.beginPath();
    this.ctx.arc(px, py, this.squareSize / 4, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw direction indicator
    this.ctx.strokeStyle = '#2196F3';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(px, py);
    const dirX = [0, 1, 0, -1][this.playerDir];
    const dirY = [-1, 0, 1, 0][this.playerDir];
    this.ctx.lineTo(
      px + dirX * (this.squareSize / 4 + 5),
      py + dirY * (this.squareSize / 4 + 5)
    );
    this.ctx.stroke();
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
