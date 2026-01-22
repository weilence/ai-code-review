import { getAllSettings } from '@/actions/config';
import { SettingsForm } from '@/components/settings/settings-form';
import { ConfigActions } from '@/components/settings/config-actions';

export default async function SettingsPage() {
  const settingsResult = await getAllSettings();

  if (!settingsResult.success || !settingsResult.config) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">设置</h1>
        <div className="rounded-xl border bg-red-50 p-6 text-red-900">
          加载设置失败: {settingsResult.error}
        </div>
      </div>
    );
  }

  const { config } = settingsResult;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">系统设置</h1>
          <p className="text-muted-foreground">
            配置 AI 代码审查系统（所有配置保存到数据库）
          </p>
        </div>

        {/* 导出/导入按钮 */}
        <ConfigActions />
      </div>

      {/* Settings Form */}
      <SettingsForm config={config} />
    </div>
  );
}
