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

// Crash type constants
enum CrashType {
  STOP = 1,  // Bounce animation
  SPIN = 2,  // Spinning animation
  FALL = 3,  // Falling animation with gravity
}

interface Position {
  x: number;
  y: number;
}

interface Skin {
  sprite: string;       // Path to sprite image (1029x51, 21 frames)
  tiles: string;        // Path to tile set image
  background: string | false;  // Path to background image or false
  look: string;         // Color for sonar look icon
  winSound: string[];   // Paths to win sound files
  crashSound: string[]; // Paths to crash sound files
  crashType: CrashType; // Type of crash animation
  name: string;         // Display name for the skin
}

// Available character skins
const SKINS: Skin[] = [
  {
    sprite: 'assets/pegman.png',
    tiles: 'assets/tiles_pegman.png',
    background: false,
    look: '#000',
    winSound: ['assets/win.mp3', 'assets/win.ogg'],
    crashSound: ['assets/fail_pegman.mp3', 'assets/fail_pegman.ogg'],
    crashType: CrashType.STOP,
    name: 'Pegman',
  },
  {
    sprite: 'assets/astro.png',
    tiles: 'assets/tiles_astro.png',
    background: 'assets/bg_astro.jpg',
    look: '#fff',
    winSound: ['assets/win.mp3', 'assets/win.ogg'],
    crashSound: ['assets/fail_astro.mp3', 'assets/fail_astro.ogg'],
    crashType: CrashType.SPIN,
    name: 'Astro',
  },
  {
    sprite: 'assets/panda.png',
    tiles: 'assets/tiles_panda.png',
    background: 'assets/bg_panda.jpg',
    look: '#000',
    winSound: ['assets/win.mp3', 'assets/win.ogg'],
    crashSound: ['assets/fail_panda.mp3', 'assets/fail_panda.ogg'],
    crashType: CrashType.FALL,
    name: 'Panda',
  },
];

// Map each possible tile shape to a sprite position in the tiles image.
// Input: Binary string representing Centre/North/West/South/East squares.
// Output: [x, y] coordinates of each tile's sprite in tiles.png (5x4 grid of 50x50 tiles).
const TILE_SHAPES: Record<string, [number, number]> = {
  '10010': [4, 0],  // Dead ends
  '10001': [3, 3],
  '11000': [0, 1],
  '10100': [0, 2],
  '11010': [4, 1],  // Vertical
  '10101': [3, 2],  // Horizontal
  '10110': [0, 0],  // Elbows
  '10011': [2, 0],
  '11001': [4, 2],
  '11100': [2, 3],
  '11110': [1, 1],  // Junctions
  '10111': [1, 0],
  '11011': [2, 1],
  '11101': [1, 2],
  '11111': [2, 2],  // Cross
  'null0': [4, 3],  // Empty
  'null1': [3, 0],
  'null2': [3, 1],
  'null3': [0, 3],
  'null4': [1, 3],
};

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
  private commandQueue: Array<() => Promise<void>> = [];
  private pegmanImage: HTMLImageElement | null = null;
  private tilesImage: HTMLImageElement | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private markerImage: HTMLImageElement | null = null;
  private imagesLoaded = false;
  private skinId: number = 0;
  private skin: Skin;
  private winAudio: HTMLAudioElement | null = null;
  private crashAudio: HTMLAudioElement | null = null;
  private animationFrame: number = 0; // Current animation frame (0-15 for direction, 16-18 for victory)
  private readonly PEGMAN_WIDTH = 49;
  private readonly PEGMAN_HEIGHT = 51;

  constructor(canvasId: string, level: number, skinId: number = 0) {
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
    this.skinId = Math.min(Math.max(skinId, 0), SKINS.length - 1);
    this.skin = SKINS[this.skinId];

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
    this.animationFrame = this.playerDir * 4; // Set initial frame based on direction

    this.loadAssets();
  }

  private loadAssets(): void {
    let imagesLoadedCount = 0;
    let totalImages = 3; // pegman, tiles, marker
    if (this.skin.background) {
      totalImages++; // Add background if it exists
    }

    const onImageLoad = () => {
      imagesLoadedCount++;
      if (imagesLoadedCount === totalImages) {
        this.imagesLoaded = true;
        this.draw();
      }
    };

    // Load pegman sprite sheet
    this.pegmanImage = new Image();
    this.pegmanImage.onload = onImageLoad;
    this.pegmanImage.src = this.skin.sprite;

    // Load tiles image
    this.tilesImage = new Image();
    this.tilesImage.onload = onImageLoad;
    this.tilesImage.src = this.skin.tiles;

    // Load background image if it exists
    if (this.skin.background) {
      this.backgroundImage = new Image();
      this.backgroundImage.onload = onImageLoad;
      this.backgroundImage.src = this.skin.background;
    }

    // Load marker image
    this.markerImage = new Image();
    this.markerImage.onload = onImageLoad;
    this.markerImage.src = 'assets/marker.png';

    // Load audio files
    this.loadAudio();

    // Draw placeholder while loading
    this.draw();
  }

  private loadAudio(): void {
    // Load win sound (try mp3 first, fallback to ogg)
    this.winAudio = new Audio();
    this.winAudio.src = this.skin.winSound[0]; // Use first format (mp3)
    this.winAudio.volume = 0.5;
    this.winAudio.load();

    // Load crash sound
    this.crashAudio = new Audio();
    this.crashAudio.src = this.skin.crashSound[0]; // Use first format (mp3)
    this.crashAudio.volume = 0.5;
    this.crashAudio.load();
  }

  public static getMaxLevel(): number {
    return MAZES.length;
  }

  public static getSkins(): Skin[] {
    return SKINS;
  }

  public setSkin(skinId: number): void {
    this.skinId = Math.min(Math.max(skinId, 0), SKINS.length - 1);
    this.skin = SKINS[this.skinId];
    this.imagesLoaded = false;
    this.loadAssets();
  }

  public getSkin(): number {
    return this.skinId;
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

    // Draw background image if available, otherwise use solid color
    if (this.backgroundImage && this.imagesLoaded && this.skin.background) {
      // Scale background to fit canvas
      this.ctx.drawImage(this.backgroundImage, 0, 0, width, height);
    } else {
      // Clear canvas with light background
      this.ctx.fillStyle = '#F1EEE7';
      this.ctx.fillRect(0, 0, width, height);
    }

    // Draw outer border
    this.ctx.strokeStyle = '#CCB';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, width, height);

    // Draw maze - use tiles image with proper shape detection
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        const square = this.maze[y][x];
        const px = x * this.squareSize;
        const py = y * this.squareSize;

        // Compute tile shape based on surrounding squares
        const normalize = (nx: number, ny: number): string => {
          if (nx < 0 || nx >= this.maze[0].length || ny < 0 || ny >= this.maze.length) {
            return '0';
          }
          return this.maze[ny][nx] === SquareType.WALL ? '0' : '1';
        };

        let tileShape = normalize(x, y) +       // Center
                       normalize(x, y - 1) +    // North
                       normalize(x + 1, y) +    // East (note: original uses x+1 for West due to coordinate system)
                       normalize(x, y + 1) +    // South
                       normalize(x - 1, y);     // West (note: original uses x-1 for East)

        // Only draw non-wall tiles
        if (square !== SquareType.WALL) {
          if (this.tilesImage && this.imagesLoaded) {
            // Determine which tile to use
            let finalShape = tileShape;
            if (!TILE_SHAPES[tileShape]) {
              // Empty square. Use null0 for large areas, with null1-4 for borders.
              if (tileShape === '00000' && Math.random() > 0.3) {
                finalShape = 'null0';
              } else {
                finalShape = 'null' + Math.floor(1 + Math.random() * 4);
              }
            }

            const [tileCol, tileRow] = TILE_SHAPES[finalShape] || [0, 0];
            const srcX = tileCol * 50;
            const srcY = tileRow * 50;

            // Draw the tile from the sprite sheet
            this.ctx.drawImage(
              this.tilesImage,
              srcX, srcY, 50, 50,
              px, py, this.squareSize, this.squareSize
            );
          } else {
            // Fallback: Draw path tiles with bright yellow highlight
            this.ctx.fillStyle = '#FFE500';
            this.ctx.fillRect(px, py, this.squareSize, this.squareSize);

            // Add subtle darker border to separate tiles
            this.ctx.strokeStyle = '#D4C000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(px, py, this.squareSize, this.squareSize);
          }

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

    // Draw player with pegman image using animation frame
    this.drawPegman(this.playerPos.x, this.playerPos.y, this.animationFrame);
  }

  /**
   * Draw pegman at specified position with given frame.
   * @param x Grid x position (can be fractional for animation)
   * @param y Grid y position (can be fractional for animation)
   * @param frame Frame number (0-15 for directions, 16-18 for victory dance)
   */
  private drawPegman(x: number, y: number, frame: number): void {
    const px = x * this.squareSize;
    const py = y * this.squareSize;

    if (this.pegmanImage && this.imagesLoaded) {
      // Pegman sprite sheet is 1029x51 with 21 frames (49x51 each)
      // Frames 0-15: Directions (16 directions for smooth rotation)
      // Frames 16-18: Victory dance frames
      const frameIndex = Math.min(Math.max(Math.floor(frame), 0), 20);
      const srcX = frameIndex * this.PEGMAN_WIDTH;
      const srcY = 0;

      // Draw pegman at appropriate size
      const destX = px + (this.squareSize - this.PEGMAN_WIDTH) / 2;
      const destY = py + (this.squareSize - this.PEGMAN_HEIGHT) / 2;

      this.ctx.drawImage(
        this.pegmanImage,
        srcX,
        srcY,
        this.PEGMAN_WIDTH,
        this.PEGMAN_HEIGHT,
        destX,
        destY,
        this.PEGMAN_WIDTH,
        this.PEGMAN_HEIGHT
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
    this.commandQueue.push(async () => {
      const dirX = [0, 1, 0, -1][this.playerDir];
      const dirY = [-1, 0, 1, 0][this.playerDir];
      const newX = this.playerPos.x + dirX;
      const newY = this.playerPos.y + dirY;

      if (!this.isValidPosition(newX, newY)) {
        await this.animateCrash(dirX, dirY);
        return;
      }

      // Smooth animation with 4 steps
      await this.animateMove(this.playerPos.x, this.playerPos.y, newX, newY);
      this.playerPos.x = newX;
      this.playerPos.y = newY;
    });
  }

  private turnLeft(): void {
    this.commandQueue.push(async () => {
      const startFrame = this.playerDir * 4;
      const endDir = ((this.playerDir + 3) % 4) as Direction;
      const endFrame = endDir * 4;
      await this.animateTurn(startFrame, endFrame);
      this.playerDir = endDir;
      this.animationFrame = endFrame;
    });
  }

  private turnRight(): void {
    this.commandQueue.push(async () => {
      const startFrame = this.playerDir * 4;
      const endDir = ((this.playerDir + 1) % 4) as Direction;
      const endFrame = endDir * 4;
      await this.animateTurn(startFrame, endFrame);
      this.playerDir = endDir;
      this.animationFrame = endFrame;
    });
  }

  /**
   * Animate smooth movement from one position to another with 4 interpolation steps.
   */
  private async animateMove(startX: number, startY: number, endX: number, endY: number): Promise<void> {
    const steps = 4;
    const deltaX = (endX - startX) / steps;
    const deltaY = (endY - startY) / steps;
    const stepDelay = 75; // 75ms per step = 300ms total

    for (let i = 1; i <= steps; i++) {
      const x = startX + deltaX * i;
      const y = startY + deltaY * i;
      this.drawPegman(x, y, this.playerDir * 4);
      this.draw();
      await this.delay(stepDelay);
    }
  }

  /**
   * Animate smooth turning with 4 interpolation steps.
   */
  private async animateTurn(startFrame: number, endFrame: number): Promise<void> {
    const steps = 4;
    let delta = endFrame - startFrame;

    // Handle wrapping (e.g., from frame 12 to frame 0)
    if (delta > 8) {
      delta = delta - 16;
    } else if (delta < -8) {
      delta = delta + 16;
    }

    const frameDelta = delta / steps;
    const stepDelay = 75; // 75ms per step = 300ms total

    for (let i = 1; i <= steps; i++) {
      let frame = startFrame + frameDelta * i;
      // Constrain to 0-15
      if (frame < 0) frame += 16;
      if (frame >= 16) frame -= 16;

      this.animationFrame = frame;
      this.draw();
      await this.delay(stepDelay);
    }
  }

  /**
   * Animate crash into wall.
   */
  private async animateCrash(deltaX: number, deltaY: number): Promise<void> {
    if (this.crashAudio) {
      this.crashAudio.currentTime = 0;
      this.crashAudio.play().catch(() => {}); // Ignore audio errors
    }

    if (this.skin.crashType === CrashType.STOP) {
      // Bounce animation
      const bounceDistance = 0.25;
      const startX = this.playerPos.x;
      const startY = this.playerPos.y;

      // Move forward slightly
      this.drawPegman(startX + deltaX * bounceDistance, startY + deltaY * bounceDistance, this.playerDir * 4);
      this.draw();
      await this.delay(75);

      // Bounce back
      this.drawPegman(startX, startY, this.playerDir * 4);
      this.draw();
      await this.delay(75);

      // Forward again
      this.drawPegman(startX + deltaX * bounceDistance, startY + deltaY * bounceDistance, this.playerDir * 4);
      this.draw();
      await this.delay(75);

      // Final return
      this.drawPegman(startX, startY, this.playerDir * 4);
      this.draw();
      await this.delay(75);
    } else {
      // For SPIN and FALL, do a simple bounce for now
      // (Full implementation would be more complex)
      const bounceDistance = 0.25;
      const startX = this.playerPos.x;
      const startY = this.playerPos.y;

      this.drawPegman(startX + deltaX * bounceDistance, startY + deltaY * bounceDistance, this.playerDir * 4);
      this.draw();
      await this.delay(150);

      this.drawPegman(startX, startY, this.playerDir * 4);
      this.draw();
      await this.delay(150);
    }
  }

  /**
   * Animate victory dance.
   */
  private async animateVictory(): Promise<void> {
    if (this.winAudio) {
      this.winAudio.currentTime = 0;
      this.winAudio.play().catch(() => {}); // Ignore audio errors
    }

    // Victory dance uses frames 16, 18, 16 pattern
    const danceFrames = [16, 18, 16, 18, 16];
    for (const frame of danceFrames) {
      this.animationFrame = frame;
      this.draw();
      await this.delay(150);
    }

    // Return to normal facing direction
    this.animationFrame = this.playerDir * 4;
    this.draw();
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
    this.animationFrame = this.playerDir * 4;
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
      await command(); // Commands are now async
    }

    this.executing = false;

    // Check if finished
    if (!this.notDone()) {
      await this.animateVictory();
      setTimeout(() => {
        alert('Success! You reached the goal!');
      }, 500);
    } else {
      alert('Program finished, but you did not reach the goal.');
    }
  }
}
