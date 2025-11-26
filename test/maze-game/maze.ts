/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Simple maze game engine.
 */

import {msg} from './messages';
import Interpreter from 'js-interpreter';

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

/**
 * Maximum number of blocks allowed per level.
 * Infinity means no limit (levels 1-2 for learning).
 */
export const MAX_BLOCKS = [
  Infinity, // Level 1: No limit (learning sequencing)
  Infinity, // Level 2: No limit (learning turns)
  2,        // Level 3: Forces use of loop
  5,        // Level 4: Loop with multiple blocks
  5,        // Level 5: Vertical maze
  5,        // Level 6: Introduces conditionals
  5,        // Level 7: If with dropdown
  10,       // Level 8: Complex navigation
  7,        // Level 9: Restrictive despite complexity
  10,       // Level 10: Final challenge
];

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
    sprite: 'assets/astro.png',
    tiles: 'assets/tiles_astro.png',
    background: 'assets/bg_astro.jpg',
    look: '#fff',
    winSound: ['assets/win.mp3', 'assets/win.ogg'],
    crashSound: ['assets/fail_astro.mp3', 'assets/fail_astro.ogg'],
    crashType: CrashType.SPIN,
    name: msg('MAZE_SKIN_ASTRO'),
  },
  {
    sprite: 'assets/wheelchair.png',
    tiles: 'assets/tiles_pegman.png',
    background: false,
    look: '#00f',
    winSound: ['assets/win.mp3', 'assets/win.ogg'],
    crashSound: ['assets/fail_pegman.mp3', 'assets/fail_pegman.ogg'],
    crashType: CrashType.STOP,
    name: msg('MAZE_SKIN_WHEELCHAIR'),
  },
  {
    sprite: 'assets/panda.png',
    tiles: 'assets/tiles_panda.png',
    background: 'assets/bg_panda.jpg',
    look: '#000',
    winSound: ['assets/win.mp3', 'assets/win.ogg'],
    crashSound: ['assets/fail_panda.mp3', 'assets/fail_panda.ogg'],
    crashType: CrashType.FALL,
    name: msg('MAZE_SKIN_PANDA'),
  },
  {
    sprite: 'assets/pegman.png',
    tiles: 'assets/tiles_pegman.png',
    background: false,
    look: '#000',
    winSound: ['assets/win.mp3', 'assets/win.ogg'],
    crashSound: ['assets/fail_pegman.mp3', 'assets/fail_pegman.ogg'],
    crashType: CrashType.STOP,
    name: msg('MAZE_SKIN_PEGMAN'),
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
 * Maze layouts by level - matches original blockly-games/maze.
 * SquareType: 0=WALL, 1=OPEN, 2=START, 3=FINISH
 */
const MAZES = [
  // Level 1: Simple straight path (2 moves)
  [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 1, 3, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 2: L-shape (one turn)
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 3, 0, 0, 0],
    [0, 0, 2, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 3: Straight path (introduces loop - block limit 2)
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 1, 1, 1, 3, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 4: Diagonal staircase (path continues past start/goal)
  [
    [0, 0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 0, 3, 1, 0],
    [0, 0, 0, 0, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 0, 0, 0, 0],
    [0, 2, 1, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0],
  ],
  // Level 5: Vertical corridor with turns
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 3, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 2, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 6: Box maze (introduces if block)
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 1, 3, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 2, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 7: Complex branching (if with dropdown)
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 0],
    [0, 2, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 0],
    [0, 1, 1, 3, 0, 1, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 8: Intricate maze
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 0],
    [0, 2, 1, 1, 0, 3, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 9: Complex winding path (introduces ifElse)
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0],
    [3, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 1, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 2, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Level 10: Wall-following challenge (final level)
  [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 3, 0, 1, 0],
    [0, 1, 1, 0, 1, 1, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 1, 0, 0, 1, 0],
    [0, 2, 1, 1, 1, 0, 1, 0],
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

  // Execution state (updated during interpreter run, separate from animation state)
  private pegmanX = 0;
  private pegmanY = 0;
  private pegmanD: Direction = Direction.EAST;

  // Log of actions recorded during execution, replayed during animation
  // Format: [action, blockId] where action is 'north'|'south'|'east'|'west'|'left'|'right'|'fail_forward'|'fail_backward'|'finish'
  private log: Array<[string, string?]> = [];

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
  private tileShapeCache: string[][] = []; // Cache tile shapes so they don't change on each draw

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

    this.computeTileShapes();
    this.loadAssets();
  }

  /**
   * Pre-compute tile shapes for the maze so they don't change on each draw.
   */
  private computeTileShapes(): void {
    const normalize = (nx: number, ny: number): string => {
      if (nx < 0 || nx >= this.maze[0].length || ny < 0 || ny >= this.maze.length) {
        return '0';
      }
      return this.maze[ny][nx] === SquareType.WALL ? '0' : '1';
    };

    this.tileShapeCache = [];
    for (let y = 0; y < this.maze.length; y++) {
      this.tileShapeCache[y] = [];
      for (let x = 0; x < this.maze[y].length; x++) {
        let tileShape = normalize(x, y) +       // Center
                       normalize(x, y - 1) +    // North
                       normalize(x + 1, y) +    // East
                       normalize(x, y + 1) +    // South
                       normalize(x - 1, y);     // West

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
        this.tileShapeCache[y][x] = finalShape;
      }
    }
  }

  private loadAssets(isInitialLoad = true): void {
    let imagesLoadedCount = 0;
    let totalImages = 3; // pegman, tiles, marker
    if (this.skin.background) {
      totalImages++; // Add background if it exists
    }

    // Store new images in temporary variables until all are loaded
    // This prevents the flash of default colors when switching skins
    let newPegmanImage: HTMLImageElement | null = null;
    let newTilesImage: HTMLImageElement | null = null;
    let newBackgroundImage: HTMLImageElement | null = null;
    let newMarkerImage: HTMLImageElement | null = null;

    const onImageLoad = () => {
      imagesLoadedCount++;
      if (imagesLoadedCount === totalImages) {
        // All images loaded - now swap them in atomically
        this.pegmanImage = newPegmanImage;
        this.tilesImage = newTilesImage;
        this.backgroundImage = newBackgroundImage;
        this.markerImage = newMarkerImage;
        this.imagesLoaded = true;
        this.draw();
      }
    };

    // Load pegman sprite sheet
    newPegmanImage = new Image();
    newPegmanImage.onload = onImageLoad;
    newPegmanImage.src = this.skin.sprite;

    // Load tiles image
    newTilesImage = new Image();
    newTilesImage.onload = onImageLoad;
    newTilesImage.src = this.skin.tiles;

    // Load background image if it exists, or clear it if not
    if (this.skin.background) {
      newBackgroundImage = new Image();
      newBackgroundImage.onload = onImageLoad;
      newBackgroundImage.src = this.skin.background;
    } else {
      newBackgroundImage = null;
    }

    // Load marker image
    newMarkerImage = new Image();
    newMarkerImage.onload = onImageLoad;
    newMarkerImage.src = 'assets/marker.png';

    // Load audio files
    this.loadAudio();

    // Only draw placeholder on initial load (when there's nothing else to show)
    // When switching skins, keep showing the old skin until new one is ready
    if (isInitialLoad) {
      this.draw();
    }
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
    // Don't set imagesLoaded = false - keep showing old skin until new one is ready
    // Pass false to loadAssets so it doesn't draw placeholder colors
    this.loadAssets(false);
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

    this.computeTileShapes();
    this.reset();
  }

  public getLevel(): number {
    return this.level + 1;
  }

  /**
   * Check if the maze is currently executing code.
   */
  public isExecuting(): boolean {
    return this.executing;
  }

  // Callback for completion events
  private completionCallbacks: Array<(success: boolean) => void> = [];

  // Callback for block highlighting during execution
  private highlightCallback: ((blockId: string | null) => void) | null = null;

  /**
   * Register a callback to be called when execution completes.
   * @param callback Function called with true if goal reached, false otherwise.
   */
  public onComplete(callback: (success: boolean) => void): void {
    this.completionCallbacks.push(callback);
  }

  /**
   * Register a callback to be called when a block should be highlighted.
   * @param callback Function called with block ID to highlight, or null to clear.
   */
  public onHighlight(callback: (blockId: string | null) => void): void {
    this.highlightCallback = callback;
  }

  /**
   * Notify all completion callbacks.
   */
  private notifyCompletion(success: boolean): void {
    this.completionCallbacks.forEach(cb => cb(success));
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

        // Draw tiles for all squares (both paths and walls)
        if (this.tilesImage && this.imagesLoaded) {
          // Get the pre-computed tile shape from cache
          const finalShape = this.tileShapeCache[y][x];

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
          // Fallback: Draw different colors for walls vs paths
          if (square === SquareType.WALL) {
            this.ctx.fillStyle = '#CCC';
          } else {
            this.ctx.fillStyle = '#FFE500';
          }
          this.ctx.fillRect(px, py, this.squareSize, this.squareSize);

          // Add subtle darker border to separate tiles
          this.ctx.strokeStyle = '#AAA';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(px, py, this.squareSize, this.squareSize);
        }

        // Draw finish marker and start position (only for non-wall tiles)
        if (square !== SquareType.WALL) {

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

      // Draw pegman at appropriate size, offset slightly upward
      const destX = px + (this.squareSize - this.PEGMAN_WIDTH) / 2;
      const destY = py + (this.squareSize - this.PEGMAN_HEIGHT) / 2 - 5;

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

  /**
   * Constrain a direction to 0-3 range (NORTH, EAST, SOUTH, WEST).
   */
  private constrainDirection4(d: number): Direction {
    return ((d % 4) + 4) % 4 as Direction;
  }

  /**
   * Check if there is a path in the given direction relative to current facing.
   * @param direction 0=forward, 1=right, 2=backward, 3=left
   * @param blockId Optional block ID for logging
   * @returns true if path exists
   */
  private isPath(direction: number, blockId?: string): boolean {
    const effectiveDirection = this.constrainDirection4(this.pegmanD + direction);
    const dirDeltas = [
      {x: 0, y: -1, look: 'look_north'},  // NORTH
      {x: 1, y: 0, look: 'look_east'},    // EAST
      {x: 0, y: 1, look: 'look_south'},   // SOUTH
      {x: -1, y: 0, look: 'look_west'},   // WEST
    ];

    const delta = dirDeltas[effectiveDirection];
    const newX = this.pegmanX + delta.x;
    const newY = this.pegmanY + delta.y;

    // Log the look action if blockId provided (for animation)
    if (blockId) {
      this.log.push([delta.look, blockId]);
    }

    return this.isValidPosition(newX, newY);
  }

  private isPathForward(blockId?: string): boolean {
    return this.isPath(0, blockId);
  }

  private isPathRight(blockId?: string): boolean {
    return this.isPath(1, blockId);
  }

  private isPathBackward(blockId?: string): boolean {
    return this.isPath(2, blockId);
  }

  private isPathLeft(blockId?: string): boolean {
    return this.isPath(3, blockId);
  }

  private isValidPosition(x: number, y: number): boolean {
    if (x < 0 || x >= this.maze[0].length || y < 0 || y >= this.maze.length) {
      return false;
    }
    return this.maze[y][x] !== SquareType.WALL;
  }

  /**
   * Move pegman in the given direction.
   * @param direction 0=forward, 2=backward
   * @param blockId Block ID for logging
   * @throws false if wall collision (stops execution)
   *
   * Note: Unlike wall collision, reaching the goal does NOT stop execution.
   * The code continues running - if you overshoot the goal, you fail.
   * Success/failure is determined by final position after all code runs.
   */
  private move(direction: number, blockId?: string): void {
    // Check for wall collision
    if (!this.isPath(direction, undefined)) {
      this.log.push([direction === 0 ? 'fail_forward' : 'fail_backward', blockId]);
      throw false; // Wall collision - stops execution
    }

    const effectiveDirection = this.constrainDirection4(this.pegmanD + direction);
    const dirDeltas = [
      {x: 0, y: -1, cmd: 'north'},  // NORTH
      {x: 1, y: 0, cmd: 'east'},    // EAST
      {x: 0, y: 1, cmd: 'south'},   // SOUTH
      {x: -1, y: 0, cmd: 'west'},   // WEST
    ];

    const delta = dirDeltas[effectiveDirection];
    this.pegmanX += delta.x;
    this.pegmanY += delta.y;
    this.log.push([delta.cmd, blockId]);

    // Do NOT stop on reaching goal - let execution continue
    // Final position is checked after all code completes
  }

  private moveForward(blockId?: string): void {
    this.move(0, blockId);
  }

  private moveBackward(blockId?: string): void {
    this.move(2, blockId);
  }

  /**
   * Turn pegman.
   * @param direction 0=left, 1=right
   * @param blockId Block ID for logging
   */
  private turn(direction: number, blockId?: string): void {
    if (direction === 1) {
      // Turn right (clockwise)
      this.pegmanD = this.constrainDirection4(this.pegmanD + 1);
      this.log.push(['right', blockId]);
    } else {
      // Turn left (counter-clockwise)
      this.pegmanD = this.constrainDirection4(this.pegmanD - 1);
      this.log.push(['left', blockId]);
    }
  }

  private turnLeft(blockId?: string): void {
    this.turn(0, blockId);
  }

  private turnRight(blockId?: string): void {
    this.turn(1, blockId);
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
      const frame = this.playerDir * 4;
      this.animationFrame = frame;
      this.drawPegman(x, y, frame);
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

  /**
   * Check if pegman has NOT reached the goal (used during execution).
   * Uses execution state (pegmanX/Y) not animation state (playerPos).
   */
  private notDone(): boolean {
    return (
      this.pegmanX !== this.finishPos.x ||
      this.pegmanY !== this.finishPos.y
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

  /**
   * Initialize the JS-Interpreter with the maze API.
   * This creates a sandboxed environment where user code can only call
   * whitelisted functions, preventing security issues and infinite loops.
   * @param interpreter The JS-Interpreter instance.
   * @param globalObject The interpreter's global scope object.
   */
  private initInterpreter(interpreter: any, globalObject: any): void {
    // Helper function to wrap our methods for the interpreter
    const wrapFunction = (fn: Function) => {
      return interpreter.createNativeFunction(fn, false);
    };

    // Register moveForward
    interpreter.setProperty(
      globalObject,
      'moveForward',
      wrapFunction((blockId?: string) => {
        this.moveForward(blockId);
      })
    );

    // Register moveBackward
    interpreter.setProperty(
      globalObject,
      'moveBackward',
      wrapFunction((blockId?: string) => {
        this.moveBackward(blockId);
      })
    );

    // Register turnLeft
    interpreter.setProperty(
      globalObject,
      'turnLeft',
      wrapFunction((blockId?: string) => {
        this.turnLeft(blockId);
      })
    );

    // Register turnRight
    interpreter.setProperty(
      globalObject,
      'turnRight',
      wrapFunction((blockId?: string) => {
        this.turnRight(blockId);
      })
    );

    // Register isPathForward
    interpreter.setProperty(
      globalObject,
      'isPathForward',
      wrapFunction((blockId?: string) => {
        return this.isPathForward(blockId);
      })
    );

    // Register isPathRight
    interpreter.setProperty(
      globalObject,
      'isPathRight',
      wrapFunction((blockId?: string) => {
        return this.isPathRight(blockId);
      })
    );

    // Register isPathBackward
    interpreter.setProperty(
      globalObject,
      'isPathBackward',
      wrapFunction((blockId?: string) => {
        return this.isPathBackward(blockId);
      })
    );

    // Register isPathLeft
    interpreter.setProperty(
      globalObject,
      'isPathLeft',
      wrapFunction((blockId?: string) => {
        return this.isPathLeft(blockId);
      })
    );

    // Register notDone
    interpreter.setProperty(
      globalObject,
      'notDone',
      wrapFunction(() => {
        return this.notDone();
      })
    );
  }

  // Result type enum matching original
  private result: 'unset' | 'success' | 'failure' | 'timeout' | 'error' = 'unset';

  public execute(code: string) {
    if (this.executing) {
      alert(msg('MAZE_ALERT_ALREADY_RUNNING'));
      return;
    }

    this.executing = true;
    this.reset();

    // Clear log and reset execution state
    this.log = [];
    this.pegmanX = this.startPos.x;
    this.pegmanY = this.startPos.y;
    this.pegmanD = Direction.EAST;
    this.result = 'unset';

    try {
      // Create interpreter with sandboxed API
      const interpreter = new Interpreter(
        code,
        (interp: any, globalObj: any) => this.initInterpreter(interp, globalObj)
      );

      // Execute code step-by-step with infinite loop protection
      // 10,000 ticks allows about 8 minutes of execution
      let ticks = 10000;
      while (interpreter.step()) {
        if (ticks-- === 0) {
          throw Infinity; // Timeout
        }
      }

      // Code execution completed normally - check if goal was reached
      this.result = this.notDone() ? 'failure' : 'success';
    } catch (e: any) {
      if (e === Infinity) {
        // Timeout
        this.result = 'timeout';
      } else if (e === false) {
        // Wall collision
        this.result = 'error';
      } else {
        // Other error
        console.error('Error executing code:', e);
        this.result = 'error';
      }
    }

    // Reset visual state and animate the recorded log
    this.playerPos = {...this.startPos};
    this.playerDir = Direction.EAST;
    this.animationFrame = Direction.EAST * 4;
    this.draw();

    // Start animation playback
    this.animate();
  }

  /**
   * Animate the recorded log of actions.
   * Recursively processes each action with appropriate delays.
   */
  private animate(): void {
    const action = this.log.shift();

    if (!action) {
      // No more actions - show result
      this.showResult();
      return;
    }

    const [cmd, blockId] = action;

    // Highlight the block that triggered this action
    if (blockId && this.highlightCallback) {
      const match = blockId.match(/^block_id_(.+)$/);
      if (match) {
        this.highlightCallback(match[1]);
      }
    }

    switch (cmd) {
      case 'north':
        this.animateMoveAsync(0, -1).then(() => setTimeout(() => this.animate(), 50));
        break;
      case 'south':
        this.animateMoveAsync(0, 1).then(() => setTimeout(() => this.animate(), 50));
        break;
      case 'east':
        this.animateMoveAsync(1, 0).then(() => setTimeout(() => this.animate(), 50));
        break;
      case 'west':
        this.animateMoveAsync(-1, 0).then(() => setTimeout(() => this.animate(), 50));
        break;
      case 'left':
        this.animateTurnAsync(-1).then(() => setTimeout(() => this.animate(), 50));
        break;
      case 'right':
        this.animateTurnAsync(1).then(() => setTimeout(() => this.animate(), 50));
        break;
      case 'fail_forward':
      case 'fail_backward': {
        const dir = cmd === 'fail_forward' ? 0 : 2;
        const effectiveDir = this.constrainDirection4(this.playerDir + dir);
        const dirDeltas = [{x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}];
        const delta = dirDeltas[effectiveDir];
        this.animateCrashAsync(delta.x, delta.y).then(() => setTimeout(() => this.animate(), 50));
        break;
      }
      case 'look_north':
      case 'look_south':
      case 'look_east':
      case 'look_west':
        // Look actions are just visual cues, skip with minimal delay
        setTimeout(() => this.animate(), 50);
        break;
      default:
        // Unknown action, skip
        setTimeout(() => this.animate(), 50);
    }
  }

  /**
   * Animate movement in a direction (async version for log playback).
   */
  private async animateMoveAsync(deltaX: number, deltaY: number): Promise<void> {
    const startX = this.playerPos.x;
    const startY = this.playerPos.y;
    const endX = startX + deltaX;
    const endY = startY + deltaY;

    await this.animateMove(startX, startY, endX, endY);
    this.playerPos.x = endX;
    this.playerPos.y = endY;
  }

  /**
   * Animate turn (async version for log playback).
   * @param direction -1 for left, 1 for right
   */
  private async animateTurnAsync(direction: number): Promise<void> {
    const startFrame = this.playerDir * 4;
    const endDir = this.constrainDirection4(this.playerDir + direction);
    const endFrame = endDir * 4;

    await this.animateTurn(startFrame, endFrame);
    this.playerDir = endDir;
    this.animationFrame = endFrame;
  }

  /**
   * Animate crash (async version for log playback).
   */
  private async animateCrashAsync(deltaX: number, deltaY: number): Promise<void> {
    await this.animateCrash(deltaX, deltaY);
  }

  /**
   * Show the result after animation completes.
   */
  private async showResult(): Promise<void> {
    this.executing = false;

    // Clear block highlighting
    if (this.highlightCallback) {
      this.highlightCallback(null);
    }

    switch (this.result) {
      case 'success':
        await this.animateVictory();
        setTimeout(() => {
          alert(msg('MAZE_SUCCESS_MESSAGE'));
          this.notifyCompletion(true);
        }, 500);
        break;
      case 'failure':
        alert(msg('MAZE_FAILURE_MESSAGE'));
        this.notifyCompletion(false);
        break;
      case 'timeout':
        alert(msg('MAZE_TIMEOUT_MESSAGE'));
        this.notifyCompletion(false);
        break;
      case 'error':
        // Wall collision - no additional message needed (crash animation shown)
        this.notifyCompletion(false);
        break;
    }
  }
}
