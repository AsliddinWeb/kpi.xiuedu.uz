import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function EmployeesLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-6 w-40" />
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
