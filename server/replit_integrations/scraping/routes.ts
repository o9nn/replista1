import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { Express } from 'express';

export function registerScrapingRoutes(app: Express) {
  const router = Router();

  router.post('/scrape', async (req: Request, res: Response) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const response = await fetch(url);
      const html = await response.text();

      res.json({ 
        url, 
        content: html,
        contentType: response.headers.get('content-type')
      });
    } catch (error) {
      console.error('Scraping error:', error);
      res.status(500).json({ error: 'Failed to scrape URL' });
    }
  });

  app.use('/api', router);
  return router;
}