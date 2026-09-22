export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      <div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-6 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 w-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ variant = "bar" }: { variant?: "bar" | "line" | "donut" }) {
  if (variant === "donut") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <Skeleton className="h-4 w-32" />
        <div className="skeleton h-36 w-36 rounded-full" />
      </div>
    );
  }

  if (variant === "line") {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="flex h-40 items-end gap-2">
        {[55, 85, 40, 70, 60, 90, 45].map((h, i) => (
          <div key={i} className="skeleton flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
