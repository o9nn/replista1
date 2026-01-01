import express, { Request, Response, Express } from 'express';
import { Router } from 'express';
import puppeteer from 'puppeteer';

export function registerScreenshotRoutes(app: Express) {
  const router = Router();

  router.post('/api/screenshot', async (req: Request, res: Response) => {
    let browser;
    try {
      const { url, selector, format = 'png', fullPage = false } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      console.log(`[Screenshot] Capturing: ${url}`);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      let screenshotOptions: any = {
        type: format,
        fullPage: fullPage
      };

      let screenshot;
      if (selector) {
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Selector "${selector}" not found`);
        }
        screenshot = await element.screenshot(screenshotOptions);
      } else {
        screenshot = await page.screenshot(screenshotOptions);
      }

      await browser.close();

      res.setHeader('Content-Type', `image/${format}`);
      res.setHeader('Content-Disposition', `attachment; filename="screenshot.${format}"`);
      res.send(screenshot);
    } catch (error: any) {
      if (browser) {
        await browser.close();
      }
      console.error('Screenshot error:', error);
      res.status(500).json({
        error: 'Failed to capture screenshot',
        details: error.message
      });
    }
  });

  app.use(router);
  return router;
}

export default registerScreenshotRoutes;