import { Router, Request, Response, Express } from 'express';
import { ragStorage } from './storage';

export function registerRAGRoutes(app: Express) {
  const router = Router();

  // Get all RAG sources
  router.get('/sources', async (req: Request, res: Response) => {
    try {
      const sources = await ragStorage.getSources();
      res.json(sources);
    } catch (error) {
      console.error('Error fetching RAG sources:', error);
      res.status(500).json({ error: 'Failed to fetch RAG sources' });
    }
  });

  // Add RAG source
  router.post('/sources', async (req: Request, res: Response) => {
    try {
      const { type, content, metadata } = req.body;

      if (!type || !content) {
        return res.status(400).json({ error: 'Type and content are required' });
      }

      const source = await ragStorage.addSource({ type, content, metadata });

      // Auto-index the new source
      try {
        await ragStorage.updateEmbeddings();
      } catch (error) {
        console.error('Error auto-indexing new source:', error);
      }

      res.json(source);
    } catch (error) {
      console.error('Error adding RAG source:', error);
      res.status(500).json({ error: 'Failed to add RAG source' });
    }
  });

  // Remove RAG source
  router.delete('/sources/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await ragStorage.removeSource(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing RAG source:', error);
      res.status(500).json({ error: 'Failed to remove RAG source' });
    }
  });

  // Get specific RAG source
  router.get('/sources/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const source = await ragStorage.getSourceById(parseInt(id, 10));

      if (!source) {
        return res.status(404).json({ error: 'Source not found' });
      }

      res.json(source);
    } catch (error) {
      console.error('Error fetching RAG source:', error);
      res.status(500).json({ error: 'Failed to fetch RAG source' });
    }
  });

  // Search RAG sources
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const { query, limit = 5 } = req.body; // Added limit parameter with default value

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const results = await ragStorage.searchSources(query, limit); // Use the limit parameter
      res.json(results);
    } catch (error) {
      console.error('Error searching RAG sources:', error);
      res.status(500).json({ error: 'Failed to search RAG sources' });
    }
  });

  // Get relevant context for a query
  router.post('/context', async (req: Request, res: Response) => {
    try {
      const { query, maxSources = 3 } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const context = await ragStorage.getRelevantContext(query, maxSources);
      res.json(context);
    } catch (error) {
      console.error('Error getting relevant context:', error);
      res.status(500).json({ error: 'Failed to get relevant context' });
    }
  });

  // Index all sources (generate embeddings)
  router.post('/index', async (req: Request, res: Response) => {
    try {
      await ragStorage.indexAllSources();
      res.json({ success: true, message: 'Indexing complete' });
    } catch (error) {
      console.error('Error indexing sources:', error);
      res.status(500).json({ error: 'Failed to index sources' });
    }
  });

  // Index a source
  router.post('/sources/:id/index', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await ragStorage.indexSource(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error indexing source:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to index source' 
      });
    }
  });

  // Reindex all sources
  router.post('/sources/reindex', async (req: Request, res: Response) => {
    try {
      const count = await ragStorage.reindexAll();
      res.json({ success: true, indexed: count });
    } catch (error) {
      console.error('Error reindexing sources:', error);
      res.status(500).json({ error: 'Failed to reindex sources' });
    }
  });

  // Reindex all sources
  router.post('/sources/reindex', async (req, res) => {
    try {
      const count = await ragStorage.reindexAll();
      res.json({ success: true, indexed: count });
    } catch (error) {
      console.error('Error reindexing sources:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to reindex sources' 
      });
    }
  });

  app.use('/api/rag', router);
}