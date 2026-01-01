
import { useState } from "react";
import { Package, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePackageManager } from "@/hooks/use-package-manager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PackageManagerPanelProps {
  language?: string;
}

export function PackageManagerPanel({ language = "nodejs" }: PackageManagerPanelProps) {
  const [packageInput, setPackageInput] = useState("");
  const {
    installPackages,
    confirmInstall,
    cancelInstall,
    pendingInstall,
    detectedManager,
    isInstalling
  } = usePackageManager(language);

  const handleInstall = () => {
    if (!packageInput.trim()) return;
    
    const packages = packageInput
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    
    if (packages.length > 0) {
      installPackages({ language, packages });
    }
  };

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <h3 className="font-semibold">Package Manager</h3>
          </div>
          {detectedManager && (
            <Badge variant="outline">{detectedManager.name}</Badge>
          )}
        </div>

        {detectedManager && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Using <strong>{detectedManager.name}</strong> for package management
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Input
            placeholder="Enter packages (comma-separated)..."
            value={packageInput}
            onChange={(e) => setPackageInput(e.target.value)}
            disabled={isInstalling}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleInstall();
              }
            }}
          />

          <Button 
            onClick={handleInstall} 
            disabled={isInstalling || !packageInput.trim()}
            className="w-full"
          >
            {isInstalling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Install Packages
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Examples:</p>
          <p className="font-mono">lodash, axios, react-query</p>
        </div>
      </Card>

      <AlertDialog open={!!pendingInstall} onOpenChange={(open) => !open && cancelInstall()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Package Installation</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>The following command will be executed:</p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                {pendingInstall?.command}
              </div>
              <p className="mt-2">
                Installing: <strong>{pendingInstall?.packages.join(', ')}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Using {pendingInstall?.manager}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelInstall}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmInstall}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Install
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
