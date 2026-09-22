import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function StructureLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-6 w-48" />
      <TableSkeleton rows={6} cols={3} />
    </div>
  );
}
