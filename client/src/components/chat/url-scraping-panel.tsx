import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function UrlScrapingPanel() {
  const [url, setUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedContent, setScrapedContent] = useState<string | null>(null);
  const { toast } = useToast();

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL to scrape",
        variant: "destructive",
      });
      return;
    }

    setIsScraping(true);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error("URL scraping failed");

      const data = await response.json();
      setScrapedContent(data.content);
      toast({ title: "URL scraped successfully" });
    } catch (error) {
      toast({
        title: "Scraping failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>URL Scraping</CardTitle>
        <CardDescription>
          Extract content from web pages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scrape-url">URL</Label>
          <Input
            id="scrape-url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isScraping}
          />
        </div>
        <Button 
          className="w-full" 
          onClick={handleScrape}
          disabled={isScraping}
        >
          {isScraping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Globe className="mr-2 h-4 w-4" />
              Scrape URL
            </>
          )}
        </Button>
        {scrapedContent && (
          <div className="space-y-2">
            <Label>Scraped Content</Label>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <pre className="text-sm whitespace-pre-wrap">{scrapedContent}</pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}