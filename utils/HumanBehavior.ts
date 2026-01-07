// src/utils/HumanBehavior.ts

import { Page } from 'puppeteer';
import { HumanCursor } from './HumanCursor';

export class HumanBehavior {
  private page: Page;
  private humanCursor: HumanCursor;

  constructor(page: Page, humanCursor: HumanCursor) {
    this.page = page;
    this.humanCursor = humanCursor;
  }

  // Simulate reading a profile
  public async readProfile(): Promise<void> {
    console.log('📖 Simulating profile reading...');
    
    // Read different sections
    await this.readSection('Experience');
    await this.readSection('Education');
    await this.readSection('Skills');
    await this.readSection('Recommendations');
  }

  private async readSection(sectionName: string): Promise<void> {
    // 60% chance to read each section
    if (Math.random() < 0.6) {
      console.log(`   👀 Reading ${sectionName} section...`);
      
      // Look for section
      const sectionSelector = `section:has-text("${sectionName}")`;
      const section = await this.page.$(sectionSelector);
      
      if (section) {
        // Scroll to section
        await section.scrollIntoView();
        await this.page.waitForTimeout(1500 + Math.random() * 2000);
        
        // Move cursor over section
        const box = await section.boundingBox();
        if (box) {
          await this.humanCursor.randomWander(box.width, box.height);
        }
      }
    }
  }

  // Random profile interactions
  public async randomInteractions(): Promise<void> {
    console.log('🔄 Random interactions...');
    
    // Random clicks on profile elements (non-interactive)
    const nonInteractiveElements = [
      'h1',
      'h2',
      '.pv-text-details__left-panel',
      '.text-body-medium'
    ];
    
    for (const selector of nonInteractiveElements) {
      if (Math.random() < 0.3) { // 30% chance per element type
        const elements = await this.page.$$(selector);
        if (elements.length > 0) {
          const randomElement = elements[Math.floor(Math.random() * elements.length)];
          const box = await randomElement.boundingBox();
          
          if (box) {
            await this.humanCursor.moveTo(
              box.x + box.width / 2,
              box.y + box.height / 2
            );
            await this.page.waitForTimeout(500 + Math.random() * 1000);
          }
        }
      }
    }
  }

  // Human-like typing with realistic patterns
  public async typeWithPersonality(
    element: any, 
    text: string, 
    personality: 'careful' | 'normal' | 'fast' = 'normal'
  ): Promise<void> {
    const speeds = {
      careful: { min: 80, max: 150 },
      normal: { min: 40, max: 100 },
      fast: { min: 20, max: 60 }
    };
    
    const speed = speeds[personality];
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const delay = speed.min + Math.random() * (speed.max - speed.min);
      
      // Different behavior for different characters
      if (char === ' ') {
        // Longer pause after space
        await element.type(char, { delay });
        if (Math.random() < 0.3) {
          await this.page.waitForTimeout(200 + Math.random() * 300);
        }
      } else if (char === '.' || char === ',' || char === '!') {
        // Pause after punctuation
        await element.type(char, { delay });
        await this.page.waitForTimeout(300 + Math.random() * 400);
      } else {
        await element.type(char, { delay });
      }
      
      // Occasional typo correction
      if (Math.random() < 0.02) { // 2% chance
        await element.press('Backspace');
        await this.page.waitForTimeout(100 + Math.random() * 200);
        await element.type(char, { delay: delay * 0.5 });
      }
    }
  }
}