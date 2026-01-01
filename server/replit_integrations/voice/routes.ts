
import { Router } from 'express';
import type { TranscriptionRequest, SynthesisRequest } from './types';

const router = Router();

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1';

router.post('/voice/transcribe', async (req, res) => {
  try {
    const request: TranscriptionRequest = req.body;
    
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ 
        error: 'OpenAI API key not configured',
        message: 'Please set OPENAI_API_KEY environment variable'
      });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(request.audioData, 'base64');
    
    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: `audio/${request.format}` });
    formData.append('file', audioBlob, `audio.${request.format}`);
    formData.append('model', 'whisper-1');
    if (request.language) {
      formData.append('language', request.language);
    }

    const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Transcription failed');
    }

    const data = await response.json();
    
    res.json({
      text: data.text,
      confidence: 1.0, // Whisper doesn't provide confidence scores
      language: request.language || 'en-US',
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/voice/synthesize', async (req, res) => {
  try {
    const request: SynthesisRequest = req.body;
    
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ 
        error: 'OpenAI API key not configured',
        message: 'Please set OPENAI_API_KEY environment variable'
      });
    }

    // Use OpenAI TTS API
    const response = await fetch(`${OPENAI_API_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: request.text,
        voice: request.voiceId || 'alloy', // alloy, echo, fable, onyx, nova, shimmer
        speed: request.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Speech synthesis failed');
    }

    // Convert audio response to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    res.json({
      audioData: base64Audio,
      format: 'mp3',
      duration: 0, // Duration not provided by OpenAI
    });
  } catch (error: any) {
    console.error('Synthesis error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/voice/config', (req, res) => {
  res.json({
    enabled: false,
    language: 'en-US',
    autoPlay: false,
  });
});

router.post('/voice/config', (req, res) => {
  // Placeholder for saving voice configuration
  res.json({ success: true });
});

export function registerVoiceRoutes() {
  return router;
}
