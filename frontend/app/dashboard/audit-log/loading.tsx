import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function AuditLogLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-6 w-40" />
      <TableSkeleton rows={20} cols={5} />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
