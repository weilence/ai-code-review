import { NextResponse } from 'next/server';
import { getQueueManager } from '@/lib/features/queue';

export async function GET() {
  try {
    const queueManager = await getQueueManager();
    const stats = await queueManager.getStats();
    const workerStats = queueManager.getWorkerStats();

    return NextResponse.json({
      success: true,
      data: {
        tasks: stats,
        workers: {
          id: workerStats.workerId,
          runningTasks: workerStats.runningTasks,
          completedTasks: workerStats.completedTasks,
          failedTasks: workerStats.failedTasks,
          utilization: Math.round(
            (workerStats.runningTasks / queueManager.queueConfig.maxConcurrentTasks) * 100
          ),
        },
        config: {
          enabled: queueManager.queueConfig.enabled,
          pollingIntervalMs: queueManager.queueConfig.pollingIntervalMs,
          maxConcurrentTasks: queueManager.queueConfig.maxConcurrentTasks,
        },
        isActive: queueManager.isActive(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
