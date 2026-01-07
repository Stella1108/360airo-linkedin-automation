// src/utils/HumanCursor.ts

import { Page, Mouse, ElementHandle } from 'puppeteer';
import { Point } from '../types';

export class HumanCursor {
  private page: Page;
  private mouse: Mouse;
  private currentPosition: Point = { x: 0, y: 0 };

  constructor(page: Page) {
    this.page = page;
    this.mouse = page.mouse;
  }

  // Sleep/wait function as replacement for waitForTimeout
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate random delay between actions
  public randomDelay(min: number = 100, max: number = 300): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Create Bezier curve points for natural mouse movement
  public bezierCurve(start: Point, end: Point, controlPoints: number = 20): Point[] {
    const points: Point[] = [];
    
    for (let i = 0; i <= controlPoints; i++) {
      const t = i / controlPoints;
      
      // Cubic Bezier curve with randomness for natural movement
      const x = this.calculateBezierPoint(
        start.x,
        start.x + Math.random() * 50,
        end.x - Math.random() * 50,
        end.x,
        t
      );
      
      const y = this.calculateBezierPoint(
        start.y,
        start.y + Math.random() * 50,
        end.y - Math.random() * 50,
        end.y,
        t
      );
      
      points.push({ x, y });
    }
    
    return points;
  }

  private calculateBezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    return uuu * p0 + 
           3 * uu * t * p1 + 
           3 * u * tt * p2 + 
           ttt * p3;
  }

  // Track current mouse position
  public async updateCurrentPosition(x: number, y: number): Promise<void> {
    this.currentPosition = { x, y };
  }

  // Move cursor with human-like behavior using Bezier curves
  public async moveTo(x: number, y: number): Promise<void> {
    const points = this.bezierCurve(this.currentPosition, { x, y });
    
    for (const point of points) {
      await this.mouse.move(point.x, point.y);
      await this.sleep(this.randomDelay(10, 30));
      await this.updateCurrentPosition(point.x, point.y);
    }
  }

  // Click with human variance (pause before and after)
  public async click(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    await this.moveTo(x, y);
    
    // Random pause before clicking (like human hesitation)
    await this.sleep(this.randomDelay(200, 500));
    
    await this.mouse.click(x, y, { button });
    
    // Random pause after clicking
    await this.sleep(this.randomDelay(100, 300));
    
    await this.updateCurrentPosition(x, y);
  }

  // Human-like scrolling with variance
  public async humanScroll(amount: number): Promise<void> {
    // Add jitter to scrolling
    const jitter = Math.random() * 20 - 10; // -10 to +10
    
    await this.page.evaluate((scrollAmount: number) => {
      window.scrollBy({ 
        top: scrollAmount, 
        behavior: 'smooth' 
      });
    }, amount + jitter);
    
    // Random wait after scrolling
    await this.sleep(800 + Math.random() * 1200);
  }

  // Type like a human with random delays and occasional errors
  public async humanType(element: ElementHandle<Element>, text: string): Promise<void> {
    const typingSpeed = 30 + Math.random() * 70; // 30-100ms per character
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // 3% chance of typo
      if (Math.random() < 0.03) {
        const typoChar = this.getRandomTypoChar(char);
        await element.type(typoChar, { delay: typingSpeed });
        await this.sleep(200 + Math.random() * 300);
        
        // Backspace and correct
        await element.press('Backspace');
        await this.sleep(100 + Math.random() * 200);
      }
      
      await element.type(char, { delay: typingSpeed });
      
      // Random pause between words
      if (char === ' ' && Math.random() < 0.3) {
        await this.sleep(300 + Math.random() * 500);
      }
    }
  }

  private getRandomTypoChar(originalChar: string): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const nearbyKeys: { [key: string]: string[] } = {
      'a': ['q', 'w', 's', 'z'],
      's': ['a', 'w', 'e', 'd', 'x', 'z'],
      'd': ['s', 'e', 'r', 'f', 'c', 'x'],
      'f': ['d', 'r', 't', 'g', 'v', 'c'],
      // Add more if needed
    };
    
    const lowerChar = originalChar.toLowerCase();
    if (nearbyKeys[lowerChar] && Math.random() < 0.5) {
      const nearby = nearbyKeys[lowerChar];
      return nearby[Math.floor(Math.random() * nearby.length)];
    }
    
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  // Random mouse wandering while "thinking"
  public async randomWander(viewportWidth: number, viewportHeight: number): Promise<void> {
    const wanderPoints = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < wanderPoints; i++) {
      const x = 100 + Math.random() * (viewportWidth - 200);
      const y = 100 + Math.random() * (viewportHeight - 200);
      
      await this.moveTo(x, y);
      await this.sleep(300 + Math.random() * 700);
    }
  }
}