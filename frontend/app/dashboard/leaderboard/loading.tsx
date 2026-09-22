import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-6 w-48" />
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
