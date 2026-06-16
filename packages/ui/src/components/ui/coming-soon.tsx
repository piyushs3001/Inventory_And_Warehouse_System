import { Sparkles } from 'lucide-react';
import { PageHead } from './page-head';
import { EmptyState } from './empty-state';

export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <div>
      <PageHead title={title} description="This screen is on the roadmap." />
      <EmptyState
        icon={<Sparkles className="size-5" aria-hidden />}
        title={`${title} arrives in Phase ${phase}`}
        description="The navigation is ready; this module ships with its API in a later build phase."
      />
    </div>
  );
}
