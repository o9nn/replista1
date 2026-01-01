
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Camera, Loader2, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Screenshot {
  url: string;
  timestamp: string;
  selector?: string;
}

export function ScreenshotPanel() {
  const [url, setUrl] = useState("");
  const [selector, setSelector] = useState("");
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const { toast } = useToast();

  const handleCapture = async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL to capture",
        variant: "destructive",
      });
      return;
    }

    setIsCapturing(true);
    try {
      const response = await fetch("/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, selector: selector || undefined, format }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to capture screenshot");
      }

      const blob = await response.blob();
      const screenshotUrl = URL.createObjectURL(blob);
      
      setScreenshots(prev => [{
        url: screenshotUrl,
        timestamp: new Date().toISOString(),
        selector,
      }, ...prev]);

      toast({
        title: "Screenshot captured",
        description: "Your screenshot has been created successfully",
      });
    } catch (error) {
      console.error("Screenshot error:", error);
      toast({
        title: "Capture failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = (screenshotUrl: string, timestamp: string) => {
    const a = document.createElement("a");
    a.href = screenshotUrl;
    a.download = `screenshot-${new Date(timestamp).getTime()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Downloaded",
      description: "Screenshot saved to your device",
    });
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Screenshot Capture</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="screenshot-url">URL</Label>
            <Input
              id="screenshot-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="screenshot-selector">CSS Selector (optional)</Label>
            <Input
              id="screenshot-selector"
              placeholder="#main-content"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="screenshot-format">Format</Label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger id="screenshot-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCapture}
            disabled={isCapturing || !url.trim()}
            className="w-full"
          >
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Capture Screenshot
              </>
            )}
          </Button>
        </div>

        {screenshots.length > 0 && (
          <div className="space-y-3 mt-6">
            <h4 className="text-sm font-medium">Recent Screenshots</h4>
            <div className="grid gap-3">
              {screenshots.map((screenshot, idx) => (
                <Card key={idx} className="p-3">
                  <img
                    src={screenshot.url}
                    alt={`Screenshot from ${screenshot.timestamp}`}
                    className="w-full rounded-md mb-2"
                  />
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(screenshot.timestamp).toLocaleString()}
                    {screenshot.selector && ` • ${screenshot.selector}`}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(screenshot.url, screenshot.timestamp)}
                    className="w-full"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Download
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
