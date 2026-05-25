export function OperationsTableSkeleton({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="h-[52px] border-b border-[var(--border)] bg-[var(--bg-surface)]" />
      <div className="flex">
        <div className="hidden min-h-[calc(100vh-52px)] w-16 border-r border-[var(--border)] bg-[var(--bg-surface)] md:block lg:w-[210px]" />
        <main className="grid flex-1 gap-5 px-4 py-5 md:px-6 md:py-6">
          <header className="grid gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-8 w-48 animate-pulse rounded bg-[var(--border)]" />
            <span className="sr-only">{title} loading</span>
          </header>
          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <div className="h-9 w-full max-w-md animate-pulse rounded-sm bg-[var(--border)]" />
            <div className="flex gap-2">
              <div className="h-9 w-32 animate-pulse rounded-sm bg-[var(--border)]" />
              <div className="h-9 w-32 animate-pulse rounded-sm bg-[var(--border)]" />
              <div className="h-9 w-32 animate-pulse rounded-sm bg-[var(--border)]" />
            </div>
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-soft">
            <div className="grid gap-3">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  className="grid h-12 grid-cols-[1.2fr_0.8fr_0.7fr_1fr] items-center gap-4 rounded-sm border border-[var(--border)] px-3"
                  key={index}
                >
                  <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--border)]" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-[var(--border)]" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--border)]" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--border)]" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="h-[52px] border-b border-[var(--border)] bg-[var(--bg-surface)]" />
      <div className="flex">
        <div className="hidden min-h-[calc(100vh-52px)] w-16 border-r border-[var(--border)] bg-[var(--bg-surface)] md:block lg:w-[210px]" />
        <main className="grid flex-1 gap-5 px-4 py-5 md:px-6 md:py-6">
          <div className="h-8 w-44 animate-pulse rounded bg-[var(--border)]" />
          <div className="flex gap-6 overflow-hidden border-b border-[var(--border)] pb-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="h-5 w-28 shrink-0 animate-pulse rounded bg-[var(--border)]"
                key={index}
              />
            ))}
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-soft">
            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  className="h-9 animate-pulse rounded bg-[var(--border)]"
                  key={index}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
