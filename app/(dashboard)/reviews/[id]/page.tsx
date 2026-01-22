import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getReview, getReviewLogs, retryReview } from '@/actions/review';
import {
  BackButton,
  ReviewHeader,
  InfoCards,
  ReviewLogs,
  MRDescription,
} from './components';

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reviewId = Number(id);

  // 获取审查记录
  const reviewResult = await getReview(reviewId);

  if (!reviewResult.success || !reviewResult.data) {
    notFound();
  }

  const review = reviewResult.data;

  // 获取所有审查日志（包括结果和错误）
  const logsResult = await getReviewLogs(reviewId);
  const logs = logsResult.success && logsResult.data ? logsResult.data : [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackButton />

      {/* Header */}
      <ReviewHeader
        review={review}
        onRetry={async () => {
          'use server';
          const result = await retryReview(reviewId);
          if (result.success) {
            // 刷新当前页面以显示最新状态
            revalidatePath(`/reviews/${id}`);
          }
        }}
      />

      {/* Info Cards */}
      <InfoCards review={review} />

      {/* Review Logs */}
      <ReviewLogs logs={logs} />

      {/* MR Description */}
      <MRDescription description={review.mrDescription} />
    </div>
  );
}
