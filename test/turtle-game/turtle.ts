/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Turtle graphics engine for the Turtle game.
 * Manages canvas drawing, turtle state, and answer validation.
 */

/**
 * Canvas dimensions
 */
export const WIDTH = 400;
export const HEIGHT = 400;

/**
 * Turtle game state
 */
export class TurtleGame {
  // Canvas contexts
  private ctxDisplay: CanvasRenderingContext2D;
  private ctxAnswer: CanvasRenderingContext2D;
  private ctxScratch: CanvasRenderingContext2D;

  // Turtle state
  private turtleX: number = HEIGHT / 2;
  private turtleY: number = WIDTH / 2;
  private turtleHeading: number = 0;
  private isPenDown: boolean = true;
  private visible: boolean = true;

  // Current level
  private level: number = 1;

  // Turtle image
  private turtleImage: HTMLImageElement;
  private turtleImageLoaded: boolean = false;

  constructor(
    displayCanvas: HTMLCanvasElement,
    answerCanvas: HTMLCanvasElement,
    scratchCanvas: HTMLCanvasElement,
    level: number
  ) {
    this.ctxDisplay = displayCanvas.getContext('2d')!;
    this.ctxAnswer = answerCanvas.getContext('2d')!;
    this.ctxScratch = scratchCanvas.getContext('2d')!;
    this.level = level;

    // Load turtle image
    this.turtleImage = new Image();
    this.turtleImage.onload = () => {
      this.turtleImageLoaded = true;
      this.display();
    };
    this.turtleImage.src = 'assets/turtle.svg';

    this.drawAnswer();
  }

  /**
   * Reset the turtle to starting position and clear the canvas.
   */
  reset(): void {
    // Starting location and heading of the turtle.
    this.turtleX = HEIGHT / 2;
    this.turtleY = WIDTH / 2;
    this.turtleHeading = 0;
    this.isPenDown = true;
    this.visible = true;

    // Clear the canvas.
    this.ctxScratch.canvas.width = this.ctxScratch.canvas.width;
    this.ctxScratch.strokeStyle = '#fff';
    this.ctxScratch.fillStyle = '#fff';
    this.ctxScratch.lineWidth = 5;
    this.ctxScratch.lineCap = 'round';
    this.ctxScratch.font = 'normal 18pt Arial';
    this.display();
  }

  /**
   * Copy the scratch canvas to the display canvas and add the turtle marker.
   */
  display(): void {
    // Clear the display with black.
    this.ctxDisplay.beginPath();
    this.ctxDisplay.rect(0, 0, this.ctxDisplay.canvas.width, this.ctxDisplay.canvas.height);
    this.ctxDisplay.fillStyle = '#000';
    this.ctxDisplay.fill();

    // Draw the answer layer (semi-transparent).
    this.ctxDisplay.globalCompositeOperation = 'source-over';
    this.ctxDisplay.globalAlpha = 0.2;
    this.ctxDisplay.drawImage(this.ctxAnswer.canvas, 0, 0);
    this.ctxDisplay.globalAlpha = 1;

    // Draw the user layer.
    this.ctxDisplay.globalCompositeOperation = 'source-over';
    this.ctxDisplay.drawImage(this.ctxScratch.canvas, 0, 0);

    // Draw the turtle if visible.
    if (this.visible) {
      const turtleSize = 40; // Size of the turtle image on canvas

      if (this.turtleImageLoaded) {
        // Draw the cute turtle image with rotation
        this.ctxDisplay.save();
        this.ctxDisplay.translate(this.turtleX, this.turtleY);
        this.ctxDisplay.rotate(this.toRadians(this.turtleHeading));
        this.ctxDisplay.drawImage(
          this.turtleImage,
          -turtleSize / 2,
          -turtleSize / 2,
          turtleSize,
          turtleSize
        );
        this.ctxDisplay.restore();
      } else {
        // Fallback: draw simple turtle shape if image not loaded yet
        this.ctxDisplay.strokeStyle = this.ctxScratch.strokeStyle;
        this.ctxDisplay.fillStyle = this.ctxScratch.fillStyle;

        const radius = this.ctxScratch.lineWidth / 2 + 10;
        this.ctxDisplay.beginPath();
        this.ctxDisplay.arc(this.turtleX, this.turtleY, radius, 0, 2 * Math.PI, false);
        this.ctxDisplay.lineWidth = 3;
        this.ctxDisplay.stroke();

        // Draw the turtle head (arrow) as fallback.
        const WIDTH_CONST = 0.3;
        const HEAD_TIP = 10;
        const ARROW_TIP = 4;
        const BEND = 6;
        let radians = this.toRadians(this.turtleHeading);
        const tipX = this.turtleX + (radius + HEAD_TIP) * Math.sin(radians);
        const tipY = this.turtleY - (radius + HEAD_TIP) * Math.cos(radians);
        radians -= WIDTH_CONST;
        const leftX = this.turtleX + (radius + ARROW_TIP) * Math.sin(radians);
        const leftY = this.turtleY - (radius + ARROW_TIP) * Math.cos(radians);
        radians += WIDTH_CONST / 2;
        const leftControlX = this.turtleX + (radius + BEND) * Math.sin(radians);
        const leftControlY = this.turtleY - (radius + BEND) * Math.cos(radians);
        radians += WIDTH_CONST;
        const rightControlX = this.turtleX + (radius + BEND) * Math.sin(radians);
        const rightControlY = this.turtleY - (radius + BEND) * Math.cos(radians);
        radians += WIDTH_CONST / 2;
        const rightX = this.turtleX + (radius + ARROW_TIP) * Math.sin(radians);
        const rightY = this.turtleY - (radius + ARROW_TIP) * Math.cos(radians);
        this.ctxDisplay.beginPath();
        this.ctxDisplay.moveTo(tipX, tipY);
        this.ctxDisplay.lineTo(leftX, leftY);
        this.ctxDisplay.bezierCurveTo(
          leftControlX,
          leftControlY,
          rightControlX,
          rightControlY,
          rightX,
          rightY
        );
        this.ctxDisplay.closePath();
        this.ctxDisplay.fill();
      }
    }
  }

  /**
   * Move the turtle forward or backward.
   * @param distance Pixels to move.
   */
  move(distance: number): void {
    if (this.isPenDown) {
      this.ctxScratch.beginPath();
      this.ctxScratch.moveTo(this.turtleX, this.turtleY);
    }
    let bump = 0;
    if (distance) {
      const radians = this.toRadians(this.turtleHeading);
      this.turtleX += distance * Math.sin(radians);
      this.turtleY -= distance * Math.cos(radians);
    } else {
      // WebKit (unlike Gecko) draws nothing for a zero-length line.
      bump = 0.1;
    }
    if (this.isPenDown) {
      this.ctxScratch.lineTo(this.turtleX, this.turtleY + bump);
      this.ctxScratch.stroke();
    }
  }

  /**
   * Turn the turtle left or right.
   * @param angle Degrees to turn clockwise.
   */
  turn(angle: number): void {
    this.turtleHeading = this.normalizeAngle(this.turtleHeading + angle);
  }

  /**
   * Lift or lower the pen.
   * @param down True if down, false if up.
   */
  setPenDown(down: boolean): void {
    this.isPenDown = down;
  }

  /**
   * Change the thickness of lines.
   * @param width New thickness in pixels.
   */
  setPenWidth(width: number): void {
    this.ctxScratch.lineWidth = width;
  }

  /**
   * Change the colour of the pen.
   * @param colour CSS colour string.
   */
  setPenColour(colour: string): void {
    this.ctxScratch.strokeStyle = colour;
    this.ctxScratch.fillStyle = colour;
  }

  /**
   * Make the turtle visible or invisible.
   * @param newVisible True if visible, false if invisible.
   */
  setVisible(newVisible: boolean): void {
    this.visible = newVisible;
  }

  /**
   * Print some text.
   * @param text Text to print.
   */
  print(text: string): void {
    this.ctxScratch.save();
    this.ctxScratch.translate(this.turtleX, this.turtleY);
    this.ctxScratch.rotate(this.toRadians(this.turtleHeading - 90));
    this.ctxScratch.fillText(text, 0, 0);
    this.ctxScratch.restore();
  }

  /**
   * Change the typeface of printed text.
   * @param font Font name (e.g. 'Arial').
   * @param size Font size (e.g. 18).
   * @param style Font style (e.g. 'italic').
   */
  setFont(font: string, size: number, style: string): void {
    this.ctxScratch.font = `${style} ${size}pt ${font}`;
  }

  /**
   * Draw the answer image for the current level.
   */
  private drawAnswer(): void {
    this.reset();
    this.answer();
    this.ctxAnswer.globalCompositeOperation = 'copy';
    this.ctxAnswer.drawImage(this.ctxScratch.canvas, 0, 0);
    this.ctxAnswer.globalCompositeOperation = 'source-over';
    // Reset again to clear the scratch canvas for the user
    this.reset();
  }

  /**
   * Generate the answer pattern for the current level.
   */
  private answer(): void {
    // Helper function to draw a star.
    const drawStar = (length: number) => {
      for (let count = 0; count < 5; count++) {
        this.move(length);
        this.turn(144);
      }
    };

    switch (this.level) {
      case 1:
        // Square.
        for (let count = 0; count < 4; count++) {
          this.move(100);
          this.turn(90);
        }
        break;
      case 2:
        // Pentagon.
        for (let count = 0; count < 5; count++) {
          this.move(100);
          this.turn(72);
        }
        break;
      case 3:
        // Star.
        this.setPenColour('#ffff00');
        drawStar(100);
        break;
      case 4:
        // Pen up/down.
        this.setPenColour('#ffff00');
        drawStar(50);
        this.setPenDown(false);
        this.move(150);
        this.setPenDown(true);
        this.move(20);
        break;
      case 5:
        // Four stars.
        this.setPenColour('#ffff00');
        for (let count = 0; count < 4; count++) {
          drawStar(50);
          this.setPenDown(false);
          this.move(150);
          this.turn(90);
          this.setPenDown(true);
        }
        break;
      case 6:
        // Three stars and a line.
        this.setPenColour('#ffff00');
        for (let count = 0; count < 3; count++) {
          drawStar(50);
          this.setPenDown(false);
          this.move(150);
          this.turn(120);
          this.setPenDown(true);
        }
        this.setPenDown(false);
        this.turn(-90);
        this.move(100);
        this.setPenDown(true);
        this.setPenColour('#ffffff');
        this.move(50);
        break;
      case 7:
        // Three stars and 4 lines.
        this.setPenColour('#ffff00');
        for (let count = 0; count < 3; count++) {
          drawStar(50);
          this.setPenDown(false);
          this.move(150);
          this.turn(120);
          this.setPenDown(true);
        }
        this.setPenDown(false);
        this.turn(-90);
        this.move(100);
        this.setPenDown(true);
        this.setPenColour('#ffffff');
        for (let count = 0; count < 4; count++) {
          this.move(50);
          this.move(-50);
          this.turn(45);
        }
        break;
      case 8:
        // Three stars and a circle.
        this.setPenColour('#ffff00');
        for (let count = 0; count < 3; count++) {
          drawStar(50);
          this.setPenDown(false);
          this.move(150);
          this.turn(120);
          this.setPenDown(true);
        }
        this.setPenDown(false);
        this.turn(-90);
        this.move(100);
        this.setPenDown(true);
        this.setPenColour('#ffffff');
        for (let count = 0; count < 360; count++) {
          this.move(50);
          this.move(-50);
          this.turn(1);
        }
        break;
      case 9:
        // Three stars and a crescent.
        this.setPenColour('#ffff00');
        for (let count = 0; count < 3; count++) {
          drawStar(50);
          this.setPenDown(false);
          this.move(150);
          this.turn(120);
          this.setPenDown(true);
        }
        this.setPenDown(false);
        this.turn(-90);
        this.move(100);
        this.setPenDown(true);
        this.setPenColour('#ffffff');
        for (let count = 0; count < 360; count++) {
          this.move(50);
          this.move(-50);
          this.turn(1);
        }
        this.turn(120);
        this.move(20);
        this.setPenColour('#000000');
        for (let count = 0; count < 360; count++) {
          this.move(50);
          this.move(-50);
          this.turn(1);
        }
        break;
      case 10:
        // Free draw - no answer pattern.
        break;
    }
  }

  /**
   * Check if the user's drawing matches the answer.
   * @param blockCount Number of blocks in the user's program.
   * @returns Result object with correct status and optional needsLoop flag.
   */
  checkAnswer(blockCount: number): {correct: boolean; needsLoop?: boolean} {
    // Level 10 is free draw - any non-trivial program is correct.
    if (this.level === 10) {
      return {correct: blockCount > 1};
    }

    // Compare the Alpha (opacity) byte of each pixel.
    const userImage = this.ctxScratch.getImageData(0, 0, WIDTH, HEIGHT);
    const answerImage = this.ctxAnswer.getImageData(0, 0, WIDTH, HEIGHT);
    const len = Math.min(userImage.data.length, answerImage.data.length);
    let pixelErrors = 0;

    // Pixels are in RGBA format. Only check the Alpha bytes.
    for (let i = 3; i < len; i += 4) {
      // Check the Alpha byte.
      if (Math.abs(userImage.data[i] - answerImage.data[i]) > 64) {
        pixelErrors++;
      }
    }

    console.log(`Pixel errors: ${pixelErrors}`);

    // Check pixel error threshold (varies by level).
    const maxErrors =
      this.level === 9 ? 600 : this.level === 8 ? 350 : 100;

    if (pixelErrors > maxErrors) {
      // Drawing doesn't match - caller should change pen to red.
      return {correct: false};
    }

    // Check block count to encourage using loops.
    if (
      (this.level <= 2 && blockCount > 3) ||
      (this.level === 3 && blockCount > 4) ||
      (this.level === 5 && blockCount > 10)
    ) {
      // Solution works but could be better with a loop.
      return {correct: false, needsLoop: true};
    }

    return {correct: true};
  }

  /**
   * Convert degrees to radians.
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Normalize an angle to be in the range [0, 360).
   */
  private normalizeAngle(angle: number): number {
    angle %= 360;
    if (angle < 0) {
      angle += 360;
    }
    return angle;
  }
}
