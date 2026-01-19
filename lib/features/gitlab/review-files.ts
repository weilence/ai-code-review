import type { ReviewConfig } from '@/lib/features/config';

export interface ParsedFile {
  path: string;
  oldPath?: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  chunks: ParsedChunk[];
}

export interface ParsedChunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: ParsedChange[];
}

export interface ParsedChange {
  type: 'add' | 'del' | 'normal';
  content: string;
  lineNumber: number;
  oldLineNumber?: number;
}

function shouldSkipFile(filePath: string, skipPatterns: string[]): boolean {
  return skipPatterns.some((pattern) => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$|/${regexPattern}$`);

    return regex.test(filePath) || filePath.endsWith(pattern.replace('*', ''));
  });
}

export function filterReviewableFiles(
  files: ParsedFile[],
  config: ReviewConfig,
): ParsedFile[] {
  return files
    .filter(file => !shouldSkipFile(file.path, config.skipFiles))
    .slice(0, config.maxFiles)
    .map(file => ({
      ...file,
      chunks: file.chunks.map(chunk => ({
        ...chunk,
        changes: chunk.changes.slice(0, config.maxLinesPerFile),
      })),
    }));
}

export function formatDiffForPrompt(files: ParsedFile[]): string {
  return files
    .map((file) => {
      const header = `\n### File: ${file.path}`;
      const status = file.isNew
        ? ' [NEW FILE]'
        : file.isDeleted
          ? ' [DELETED]'
          : file.isRenamed
            ? ` [RENAMED from ${file.oldPath}]`
            : '';

      const chunks = file.chunks
        .map((chunk) => {
          const location = `Lines ${chunk.newStart}-${chunk.newStart + chunk.newLines - 1}`;
          const changes = chunk.changes
            .map((c) => {
              const prefix = c.type === 'add' ? '+' : c.type === 'del' ? '-' : ' ';
              const lineNum = c.type === 'del' ? c.oldLineNumber : c.lineNumber;

              return `${lineNum?.toString().padStart(4, ' ')} ${prefix} ${c.content.slice(1)}`;
            })
            .join('\n');

          return `\`\`\`diff\n${location}\n${changes}\n\`\`\``;
        })
        .join('\n\n');

      return `${header}${status}\n${chunks}`;
    })
    .join('\n\n---\n');
}
