import { useMutation, useQuery } from '@tanstack/react-query';
import { useCommandHistory } from './use-command-history';
import { useToast } from './use-toast';

interface InstallPackagesParams {
  language: string;
  packages: string[];
}

export function usePackageOperations() {
  const { addExecution } = useCommandHistory();
  const { toast } = useToast();

  const installPackagesMutation = useMutation({
    mutationFn: async ({ language, packages }: InstallPackagesParams) => {
      const response = await fetch('/api/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          packageList: packages.join(', ')
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to install packages');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      const command = getInstallCommand(variables.language, variables.packages);
      if (command) {
        addExecution({
          command,
          output: `Successfully installed ${variables.packages.join(', ')}`,
          exitCode: 0,
        });
      }

      toast({
        title: 'Packages installed',
        description: `Installed ${variables.packages.join(', ')} for ${variables.language}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Installation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const listPackagesQuery = useQuery({
    queryKey: ['packages', 'installed'],
    queryFn: async () => {
      const response = await fetch('/api/packages/list');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to list packages');
      }

      return data;
    },
  });

  const getInstallCommand = (language: string, packages: string[]): string => {
    switch (language.toLowerCase()) {
      case 'nodejs':
      case 'javascript':
      case 'typescript':
        return `npm install ${packages.join(' ')}`;
      case 'python':
        return `pip install ${packages.join(' ')}`;
      case 'ruby':
        return `gem install ${packages.join(' ')}`;
      case 'go':
        return `go get ${packages.join(' ')}`;
      case 'rust':
        return `cargo add ${packages.join(' ')}`;
      default:
        return `# Install ${packages.join(', ')} for ${language}`;
    }
  };

  const installPackage = async (language: string, packageName: string) => {
    await installPackagesMutation.mutateAsync({
      language,
      packages: [packageName],
    });
  };

  const installMultiplePackages = async (language: string, packages: string[]) => {
    await installPackagesMutation.mutateAsync({
      language,
      packages,
    });
  };

  return {
    installPackage,
    installMultiplePackages,
    installPackages: installPackagesMutation.mutateAsync,
    installedPackages: listPackagesQuery.data || [],
    isInstalling: installPackagesMutation.isPending,
    isLoadingPackages: listPackagesQuery.isLoading,
    getInstallCommand,
  };
}