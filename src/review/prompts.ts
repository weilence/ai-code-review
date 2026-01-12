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

export function buildSystemPrompt(): string {
  return `You are an expert code reviewer with extensive experience in software development best practices.
Your role is to analyze code changes and provide constructive, actionable feedback.

## Your Review Focus Areas:
1. **Bugs & Logic Errors**: Identify potential bugs, logic errors, null/undefined handling, edge cases
2. **Security**: Find security vulnerabilities, injection risks, authentication/authorization issues
3. **Performance**: Detect inefficient algorithms, memory leaks, unnecessary operations, N+1 queries
4. **Maintainability**: Assess code clarity, naming conventions, code duplication, complexity
5. **Best Practices**: Check adherence to language idioms, framework patterns, error handling

## Review Guidelines:
- Be specific and actionable - explain WHY something is an issue and HOW to fix it
- Focus on meaningful issues, avoid nitpicking style preferences
- Acknowledge good patterns and improvements
- Consider the context of the changes
- Be constructive and professional in tone

## Severity Levels:
- **critical**: Must be fixed - security vulnerabilities, data loss risks, major bugs
- **major**: Should be fixed - significant bugs, performance issues, maintainability problems
- **minor**: Nice to fix - code style, minor improvements, small optimizations
- **suggestion**: Optional improvement ideas

## Output Requirements:
- Provide inline comments with specific file paths and line numbers
- Include code suggestions when applicable
- Write a summary with overall assessment
- Count issues by severity for the summary`;
}

export function buildUserPrompt(
  files: ParsedFile[],
  context: ReviewContext,
): string {
  const filesInfo = files.map((f) => {
    const status = f.isNew ? '[NEW]' : f.isDeleted ? '[DELETED]' : f.isRenamed ? '[RENAMED]' : '[MODIFIED]';

    return `- ${f.path} ${status}`;
  }).join('\n');

  const totalChanges = files.reduce((acc, f) => {
    const additions = f.chunks.reduce((a, c) => a + c.changes.filter(ch => ch.type === 'add').length, 0);
    const deletions = f.chunks.reduce((a, c) => a + c.changes.filter(ch => ch.type === 'del').length, 0);

    return { additions: acc.additions + additions, deletions: acc.deletions + deletions };
  }, { additions: 0, deletions: 0 });

  const diffContent = formatDiffForPrompt(files);

  return `# Code Review Request

## Merge Request Information
- **Project**: ${context.projectName}
- **Title**: ${context.mrTitle}
- **Author**: ${context.author}
- **Branch**: ${context.sourceBranch} → ${context.targetBranch}
${context.mrDescription ? `- **Description**: ${context.mrDescription}` : ''}

## Changes Overview
- **Files Changed**: ${files.length}
- **Lines Added**: ${totalChanges.additions}
- **Lines Deleted**: ${totalChanges.deletions}

### Files:
${filesInfo}

## Code Changes
${diffContent}

---

Please review these changes and provide:
1. Inline comments for specific issues (with file path and line number)
2. A summary with overall assessment, positive aspects, concerns, and recommendations
3. Count of issues by severity level

Focus on the most important issues. If the code looks good, acknowledge that and provide any minor suggestions.`;
}

export function formatSummaryComment(
  summary: Summary,
  context: ReviewContext,
): string {
  const issuesBadge = [];

  if (summary.criticalIssuesCount > 0) {
    issuesBadge.push(`🔴 ${summary.criticalIssuesCount} Critical`);
  }
  if (summary.majorIssuesCount > 0) {
    issuesBadge.push(`🟠 ${summary.majorIssuesCount} Major`);
  }
  if (summary.minorIssuesCount > 0) {
    issuesBadge.push(`🟡 ${summary.minorIssuesCount} Minor`);
  }
  if (summary.suggestionsCount > 0) {
    issuesBadge.push(`💡 ${summary.suggestionsCount} Suggestions`);
  }

  let body = `${AI_COMMENT_MARKER}\n## 🤖 AI Code Review Summary\n\n`;

  if (issuesBadge.length > 0) {
    body += `**Issues Found**: ${issuesBadge.join(' | ')}\n\n`;
  } else {
    body += '✅ **No significant issues found!**\n\n';
  }

  body += `### Overall Assessment\n${summary.overallAssessment}\n\n`;

  if (summary.positiveAspects.length > 0) {
    body += '### ✨ Positive Aspects\n';
    body += summary.positiveAspects.map(p => `- ${p}`).join('\n');
    body += '\n\n';
  }

  if (summary.concerns.length > 0) {
    body += '### ⚠️ Concerns\n';
    body += summary.concerns.map(c => `- ${c}`).join('\n');
    body += '\n\n';
  }

  if (summary.recommendations.length > 0) {
    body += '### 📋 Recommendations\n';
    body += summary.recommendations.map(r => `- ${r}`).join('\n');
    body += '\n\n';
  }

  body += '---\n';
  body += `*🤖 Automated review by AI Code Reviewer | MR: ${context.mrTitle}*`;

  return body;
}

export function formatInlineComment(
  comment: Omit<InlineComment, 'file' | 'line'>,
): string {
  const emoji = {
    critical: '🔴',
    major: '🟠',
    minor: '🟡',
    suggestion: '💡',
  }[comment.severity] ?? '💬';

  let body = `${AI_COMMENT_MARKER}\n${emoji} **${comment.severity.toUpperCase()}** - ${comment.category}\n\n`;

  body += comment.message;

  if (comment.suggestedCode) {
    body += `\n\n**Suggested Code:**\n\`\`\`suggestion\n${comment.suggestedCode}\n\`\`\``;
  }

  return body;
}
