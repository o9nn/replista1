import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Image, Loader2, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Wand2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: string;
}

export function ImageGenerationPanel() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"256x256" | "512x512" | "1024x1024">("1024x1024");
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (variables: { prompt: string; size: string }) => {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate image");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      setGeneratedImages(prev => [{
        url: data.url || `data:image/png;base64,${data.b64_json}`,
        prompt: variables.prompt,
        timestamp: new Date().toISOString(),
      }, ...prev]);

      toast({
        title: "Image generated",
        description: "Your image has been created successfully",
      });

      setPrompt("");
    },
    onError: (error) => {
      console.error("Image generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setGenerating(false);
    }
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description for the image",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    generateMutation.mutate({ prompt, size });
  };

  const handleDownload = async (url: string, prompt: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast({
        title: "Downloaded",
        description: "Image saved to your device",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download image",
        variant: "destructive",
      });
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "Image URL copied to clipboard",
    });
  };


  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold">Image Generation</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="image-prompt">Prompt</Label>
            <Input
              id="image-prompt"
              placeholder="A serene landscape with mountains and a lake at sunset..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>

          <div>
            <Label htmlFor="image-size">Size</Label>
            <Select value={size} onValueChange={(v: any) => setSize(v)}>
              <SelectTrigger id="image-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="256x256">256x256</SelectItem>
                <SelectItem value="512x512">512x512</SelectItem>
                <SelectItem value="1024x1024">1024x1024</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Image className="h-4 w-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </div>

        {generatedImages.length > 0 && (
          <div className="space-y-3 mt-6">
            <h4 className="text-sm font-medium">Generated Images</h4>
            <div className="grid gap-3">
              {generatedImages.map((image, idx) => (
                <Card key={idx} className="p-3">
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full rounded-md mb-2"
                  />
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {image.prompt}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(image.url, image.prompt)}
                      className="flex-1"
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyUrl(image.url)}
                      className="flex-1"
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy URL
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}