import type { SystemModelMessage } from 'ai';
import type { Language } from '@/lib/features/config';
import type { ParsedFile } from '@/lib/features/gitlab';
import { formatDiffForPrompt } from '@/lib/features/gitlab';
import type { InlineComment, Summary } from './schema';

export const AI_COMMENT_MARKER = '<!-- ai-code-review-bot -->';

export interface ReviewContext {
  projectName: string;
  mrTitle: string;
  mrDescription?: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
}

export function buildSystemPrompt(language?: Language): SystemModelMessage[] {
  const prompt = `You are a senior software engineer reviewing a teammate's code. Be direct, helpful, and conversational.

## CRITICAL: Always Provide Output
- You MUST review the code provided, no matter how small or limited
- Even trivial changes need at least a brief summary
- If unclear, review what you can see and note assumptions
- Empty reviews or refusals are NOT acceptable

## Focus On
Production issues that matter:
- Bugs, security vulnerabilities, performance problems
- Hard-to-maintain code, missing error handling
- Skip: style nitpicks, theoretical issues, subjective preferences

## Output Format
**Inline Comments**: Direct, actionable feedback on specific lines. Explain what's wrong and why. Include suggestedCode for straightforward fixes.

**Summary**: Brief overall assessment. Mention positives naturally, list main concerns, keep it conversational.

## Severity (assign but don't mention in message)
- critical: Security holes, data loss, definite bugs
- major: Significant bugs, performance issues, maintainability problems
- minor: Small improvements, optimizations
- suggestion: Alternative approaches

## Style
- Explain WHY, not just WHAT
- Use natural language: "This could cause..." or "Consider..."
- Vary phrasing, be direct but respectful`;

  const messages: SystemModelMessage[] = [{ role: 'system', content: prompt }];

  if (language) {
    messages.push({
      role: 'system',
      content: 'You must respond in ' + language,
    });
  }

  return messages;
}

export function buildUserPrompt(
  files: ParsedFile[],
  context: ReviewContext,
): string {
  const diffContent = formatDiffForPrompt(files);

  let prompt = `## ${context.mrTitle}\n`;

  if (context.mrDescription) {
    prompt += `${context.mrDescription}\n`;
  }

  prompt += `\n${diffContent}`;

  return prompt;
}

export function formatSummaryComment(
  summary: Summary,
): string {
  const totalIssues = summary.issuesCount.critical + summary.issuesCount.major + summary.issuesCount.minor;

  let body = `${AI_COMMENT_MARKER}\n## Code Review\n\n`;

  body += `${summary.overallAssessment}\n\n`;

  if (summary.positiveAspects.length > 0) {
    body += '**What looks good:**\n';
    body += summary.positiveAspects.map(p => `- ${p}`).join('\n');
    body += '\n\n';
  }

  if (summary.concerns.length > 0) {
    body += '**Things to address:**\n';
    body += summary.concerns.map(c => `- ${c}`).join('\n');
    body += '\n\n';
  }

  if (totalIssues > 0 || summary.issuesCount.suggestion > 0) {
    const parts = [];

    if (summary.issuesCount.critical > 0) {
      parts.push(`${summary.issuesCount.critical} critical`);
    }
    if (summary.issuesCount.major > 0) {
      parts.push(`${summary.issuesCount.major} major`);
    }
    if (summary.issuesCount.minor > 0) {
      parts.push(`${summary.issuesCount.minor} minor`);
    }
    if (summary.issuesCount.suggestion > 0) {
      parts.push(`${summary.issuesCount.suggestion} suggestion${summary.issuesCount.suggestion > 1 ? 's' : ''}`);
    }
    body += `---\n_${parts.join(', ')}_`;
  }

  return body;
}

export function formatInlineComment(
  comment: Omit<InlineComment, 'file' | 'line'>,
): string {
  let body = `${AI_COMMENT_MARKER}\n`;

  body += comment.message;

  if (comment.suggestedCode) {
    body += `\n\n\`\`\`suggestion\n${comment.suggestedCode}\n\`\`\``;
  }

  return body;
}

export function formatPendingComment(): string {
  return `${AI_COMMENT_MARKER}\n_Reviewing..._`;
}

export function formatErrorComment(error: string): string {
  return `${AI_COMMENT_MARKER}\n**Review failed**\n\n${error}`;
}
