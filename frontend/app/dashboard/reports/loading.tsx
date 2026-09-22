import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-6 w-36" />
      <div className="space-y-6">
        <TableSkeleton rows={4} cols={3} />
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <Skeleton className="mb-3 h-4 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
}
