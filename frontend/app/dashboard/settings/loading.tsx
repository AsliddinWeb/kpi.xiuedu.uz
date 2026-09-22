import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-xl">
      <Skeleton className="mb-6 h-6 w-40" />
      <div className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div>
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}
