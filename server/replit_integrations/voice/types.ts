
export interface VoiceConfig {
  enabled: boolean;
  language: string;
  voiceId?: string;
  autoPlay: boolean;
}

export interface TranscriptionRequest {
  audioData: string; // base64 encoded
  format: 'webm' | 'wav' | 'mp3';
  language?: string;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  language: string;
}

export interface SynthesisRequest {
  text: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
}

export interface SynthesisResponse {
  audioData: string; // base64 encoded
  format: string;
  duration: number;
}
