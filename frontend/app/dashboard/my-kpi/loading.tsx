import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function MyKpiLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-6 w-48" />
      <TableSkeleton rows={5} cols={3} />
    </div>
  );
}
