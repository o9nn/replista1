
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface VoiceControlsProps {
  onTranscription?: (text: string) => void;
  onSynthesis?: (audioData: string) => void;
  enabled?: boolean;
}

export function VoiceControls({ 
  onTranscription, 
  onSynthesis,
  enabled = true 
}: VoiceControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState([1.0]);
  const [voiceEnabled, setVoiceEnabled] = useState(enabled);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load voice config on mount
    fetch('/api/voice/config')
      .then(res => res.json())
      .then(config => {
        setVoiceEnabled(config.enabled);
        setAutoPlay(config.autoPlay);
      })
      .catch(console.error);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: any) {
      toast({
        title: 'Microphone Error',
        description: error.message || 'Failed to access microphone',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Audio,
            format: 'webm',
            language: 'en-US'
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Transcription failed');
        }

        const data = await response.json();
        onTranscription?.(data.text);
      };
    } catch (error: any) {
      toast({
        title: 'Transcription Error',
        description: error.message || 'Failed to transcribe audio',
        variant: 'destructive'
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const synthesizeSpeech = async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speed: speed[0]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 503) {
          throw new Error('Voice API not configured. Please add OPENAI_API_KEY to secrets.');
        }
        throw new Error(error.error || 'Speech synthesis failed');
      }

      const data = await response.json();
      onSynthesis?.(data.audioData);
      
      // Play audio if autoPlay is enabled
      if (autoPlay) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioData}`);
        audio.playbackRate = speed[0];
        await audio.play();
      }
    } catch (error: any) {
      toast({
        title: 'Speech Synthesis Error',
        description: error.message || 'Failed to generate speech',
        variant: 'destructive'
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  const saveConfig = async () => {
    try {
      await fetch('/api/voice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: voiceEnabled,
          autoPlay,
          language: 'en-US'
        })
      });
    } catch (error) {
      console.error('Failed to save voice config:', error);
    }
  };

  useEffect(() => {
    saveConfig();
  }, [voiceEnabled, autoPlay]);

  if (!voiceEnabled) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={isRecording ? "destructive" : "ghost"}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isTranscribing}
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost">
            {isSpeaking ? (
              <Volume2 className="h-4 w-4 animate-pulse" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Voice Settings</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="voice-enabled">Enable Voice</Label>
                <Switch
                  id="voice-enabled"
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-play">Auto-play Responses</Label>
                <Switch
                  id="auto-play"
                  checked={autoPlay}
                  onCheckedChange={setAutoPlay}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Speech Speed: {speed[0].toFixed(1)}x</Label>
              <Slider
                value={speed}
                onValueChange={setSpeed}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>

            <Badge variant="outline" className="w-full justify-center">
              Requires API Integration
            </Badge>
          </div>
        </PopoverContent>
      </Popover>

      {isRecording && (
        <Badge variant="destructive" className="animate-pulse">
          Recording...
        </Badge>
      )}
    </div>
  );
}
