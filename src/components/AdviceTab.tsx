import { Loader2, Brain } from 'lucide-react';

interface AdviceTabProps {
  sections: { emoji: string; title: string; content: string }[] | null;
  isLoading: boolean;
}

export default function AdviceTab({ sections, isLoading }: AdviceTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-body">Crunching your numbers...</p>
      </div>
    );
  }

  if (!sections) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Brain className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-body text-center">
          No analysis yet. Hit "Analyze My Finances" on the Overview tab to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {sections.map((section, i) => (
        <div key={i} className="bg-card rounded-lg p-4">
          <h3 className="font-heading text-base text-primary mb-2">
            {section.emoji} {section.title}
          </h3>
          <div className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
}
