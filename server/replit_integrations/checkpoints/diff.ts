
import type { Checkpoint } from '@/hooks/use-assistant-store';
import { checkpointStorage } from './storage';

export interface FileDiff {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  oldContent?: string;
  newContent?: string;
  additions: number;
  deletions: number;
}

export async function getCheckpointDiff(
  checkpointId: string,
  previousCheckpointId?: string
): Promise<FileDiff[]> {
  const checkpoint = await checkpointStorage.getCheckpoint(checkpointId);
  if (!checkpoint) {
    throw new Error('Checkpoint not found');
  }

  const previousCheckpoint = previousCheckpointId
    ? await checkpointStorage.getCheckpoint(previousCheckpointId)
    : null;

  const diffs: FileDiff[] = [];
  const currentFiles = new Map(
    checkpoint.files.map((f) => [f.path, f.content])
  );
  const previousFiles = new Map(
    previousCheckpoint?.files.map((f) => [f.path, f.content]) || []
  );

  // Find modified and deleted files
  for (const [path, oldContent] of previousFiles) {
    const newContent = currentFiles.get(path);
    if (!newContent) {
      diffs.push({
        path,
        type: 'deleted',
        oldContent,
        additions: 0,
        deletions: oldContent.split('\n').length,
      });
    } else if (newContent !== oldContent) {
      const { additions, deletions } = countDiffLines(oldContent, newContent);
      diffs.push({
        path,
        type: 'modified',
        oldContent,
        newContent,
        additions,
        deletions,
      });
    }
  }

  // Find added files
  for (const [path, newContent] of currentFiles) {
    if (!previousFiles.has(path)) {
      diffs.push({
        path,
        type: 'added',
        newContent,
        additions: newContent.split('\n').length,
        deletions: 0,
      });
    }
  }

  return diffs;
}

function countDiffLines(
  oldContent: string,
  newContent: string
): { additions: number; deletions: number } {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Simple line-based diff counting
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let additions = 0;
  let deletions = 0;

  for (const line of newLines) {
    if (!oldSet.has(line)) additions++;
  }

  for (const line of oldLines) {
    if (!newSet.has(line)) deletions++;
  }

  return { additions, deletions };
}
