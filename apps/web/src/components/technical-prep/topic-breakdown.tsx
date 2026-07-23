import type { TopicBreakdownEntry } from "@/types/technical-prep";

interface TopicBreakdownProps {
  topics: TopicBreakdownEntry[];
}

export function TopicBreakdown({ topics }: TopicBreakdownProps) {
  const maxWeight = Math.max(...topics.map((topic) => topic.weight), 1);

  return (
    <div className="flex flex-col gap-3">
      {topics.map((topic) => (
        <div key={topic.topic} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{topic.topic}</span>
            <span className="text-muted-foreground">{topic.weight}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(topic.weight / maxWeight) * 100}%` }}
            />
          </div>
          {topic.rationale && (
            <p className="text-xs text-muted-foreground">{topic.rationale}</p>
          )}
        </div>
      ))}
    </div>
  );
}
