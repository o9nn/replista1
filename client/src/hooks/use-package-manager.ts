import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useState } from 'react';

interface InstallPackagesParams {
  language: string;
  packages: string[];
  confirmed?: boolean;
}

interface PackageManager {
  name: string;
  command: string;
  installCmd: string;
  lockFile: string;
}

export function usePackageManager(language?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingInstall, setPendingInstall] = useState<{
    language: string;
    packages: string[];
    command: string;
    manager: string;
  } | null>(null);

  const { data: detectedManager } = useQuery<{ manager: PackageManager }>({
    queryKey: ['package-manager-detect', language],
    queryFn: async () => {
      if (!language) throw new Error('Language not specified');
      const response = await fetch('/api/packages/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to detect package manager');
      }

      return response.json();
    },
    enabled: !!language,
  });

  const getPackageInfo = useMutation({
    mutationFn: async (packages: string[]) => {
      const response = await fetch("/api/package-manager/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages }),
      });
      if (!response.ok) throw new Error("Failed to get package info");
      return response.json();
    },
  });

  const installPackages = useMutation({
    mutationFn: async ({ language, packages, confirmed = false }: InstallPackagesParams) => {
      const response = await fetch('/api/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          packageList: packages.join(', '),
          confirmed
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresConfirmation) {
          setPendingInstall({
            language,
            packages,
            command: data.command,
            manager: data.manager
          });
          return { requiresConfirmation: true, ...data };
        }
        throw new Error(data.error || 'Failed to install packages');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      if (data.requiresConfirmation) {
        return;
      }

      setPendingInstall(null);
      toast({
        title: 'Packages installed',
        description: `Installed ${variables.packages.join(', ')} using ${data.manager}`,
      });
    },
    onError: (error: Error) => {
      if (error.message !== 'CONFIRMATION_REQUIRED') {
        toast({
          title: 'Installation failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  });

  const uninstallPackages = useMutation({
    mutationFn: async ({ packages, confirmed = false }: { packages: string[], confirmed?: boolean }) => {
      const response = await fetch("/api/package-manager/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages, confirmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresConfirmation) {
          throw new Error("CONFIRMATION_REQUIRED");
        }
        throw new Error(data.error || "Failed to uninstall packages");
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Packages uninstalled",
        description: `Successfully removed packages using ${data.packageManager}`,
      });
    },
    onError: (error: Error) => {
      if (error.message !== "CONFIRMATION_REQUIRED") {
        toast({
          title: "Failed to uninstall packages",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const confirmInstall = () => {
    if (!pendingInstall) return;

    installPackages.mutate({
      language: pendingInstall.language,
      packages: pendingInstall.packages,
      confirmed: true
    });
  };

  const cancelInstall = () => {
    setPendingInstall(null);
  };

  return {
    installPackages: installPackages.mutate,
    uninstallPackages: uninstallPackages.mutate,
    getPackageInfo: getPackageInfo.mutate,
    confirmInstall,
    cancelInstall,
    pendingInstall,
    detectedManager: detectedManager?.manager,
    isInstalling: installPackages.isPending,
    isUninstalling: uninstallPackages.isPending,
    isGettingInfo: getPackageInfo.isPending,
  };
}