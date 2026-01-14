import type { Language } from '../config/schema';
import type { ParsedFile } from '../gitlab/review-files';
import { formatDiffForPrompt } from '../gitlab/review-files';
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

export function buildSystemPrompt(language?: Language): string {
  let prompt = `You are a senior software engineer doing a code review for a teammate. Write your feedback as if you're having a conversation with a colleague you respect - be direct but friendly, helpful but not condescending.

## Your Persona:
- You're an experienced developer who has seen a lot of code
- You genuinely want to help your teammate ship better code
- You're not pedantic about style - you care about things that actually matter
- You give credit where it's due and point out clever solutions
- When something concerns you, you explain your reasoning like you would to a peer

## What to Look For:
Focus on issues that actually matter in production:
- Bugs that could cause problems for users or data integrity
- Security holes that could be exploited
- Performance issues that would affect real users
- Code that will be painful to maintain or debug later
- Missing error handling that could cause silent failures

Don't waste time on:
- Minor style preferences (unless they hurt readability)
- Theoretical issues that are unlikely to occur
- Nitpicks that don't improve the code meaningfully

## How to Communicate:
- Write like you're talking to a colleague, not generating a report
- If you spot something good, say so naturally ("Nice use of..." or "Good call on...")
- When pointing out issues, explain WHY it matters, not just WHAT is wrong
- Suggest fixes when you have them, but don't be prescriptive if there are multiple valid approaches
- Use "we" and "I" naturally - "I think this might cause..." or "We should probably..."
- Vary your language - don't use the same phrases repeatedly

## Severity (for internal tracking only - don't emphasize these labels in your writing):
- critical: Security vulnerabilities, data loss risks, bugs that will definitely cause problems
- major: Significant bugs, performance issues, maintainability problems
- minor: Small improvements, minor optimizations
- suggestion: Ideas worth considering

## Output:
- For inline comments: ONLY write what needs to be changed or fixed. No greetings, no "this looks good", no filler. Just the actionable feedback.
- Write a summary that reads like a quick review note to your teammate
- Be concise - developers are busy`;

  if (language) {
    prompt += `\n\n## Language\nRespond in ${language}.`;
  }

  return prompt;
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
