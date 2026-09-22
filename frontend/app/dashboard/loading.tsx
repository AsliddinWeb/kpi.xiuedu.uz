import { CardSkeleton, ChartSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
        <Skeleton className="h-7 w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton variant="donut" />
        <ChartSkeleton variant="bar" />
      </div>

      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
