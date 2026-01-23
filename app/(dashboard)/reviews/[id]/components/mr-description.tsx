import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MRDescriptionProps {
  description: string | null;
}

export function MRDescription({ description }: MRDescriptionProps) {
  if (!description) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">MR 描述</h2>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {description}
        </ReactMarkdown>
      </div>
    </div>
  );
}
