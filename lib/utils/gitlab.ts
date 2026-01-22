/**
 * GitLab URL 解析工具
 */

/**
 * 解析 GitLab Merge Request URL
 * @param url - GitLab MR URL (例如: https://gitlab.yamu.com/wei.luo/scripts-tool/-/merge_requests/1)
 * @returns 解析后的项目路径和 MR IID
 */
export function parseGitLabMRUrl(url: string): {
  projectPath: string;
  mrIid: number;
  baseUrl: string;
} | null {
  try {
    const urlObj = new URL(url);

    // 提取 base URL（用于 API 调用）
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    // 解析路径：/namespace/project/-/merge_requests/1
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // 检查路径格式
    const mrIndex = pathParts.indexOf('merge_requests');
    if (mrIndex === -1 || mrIndex < 2) {
      return null;
    }

    // 提取 MR IID
    const mrIidStr = pathParts[mrIndex + 1];
    const mrIid = parseInt(mrIidStr, 10);
    if (isNaN(mrIid)) {
      return null;
    }

    // 提取项目路径（namespace/project）
    // 格式：["namespace", "project", "-", "merge_requests", "1"]
    // 注意：需要排除 "-" 元素，它是 GitLab 的分隔符
    const projectPathParts = pathParts.slice(0, mrIndex).filter(part => part !== '-');
    const projectPath = projectPathParts.join('/');

    return {
      projectPath,
      mrIid,
      baseUrl,
    };
  } catch {
    return null;
  }
}

/**
 * 从项目路径获取项目信息
 * 注意：这需要调用 GitLab API，因为我们需要项目的数字 ID
 */
export interface ProjectInfo {
  id: number;
  pathWithNamespace: string;
}

/**
 * 验证 GitLab URL 格式
 */
export function isValidGitLabUrl(url: string): boolean {
  return parseGitLabMRUrl(url) !== null;
}
