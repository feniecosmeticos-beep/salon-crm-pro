export default function Loading() {
  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="h-36 animate-pulse rounded-lg bg-muted" key={index} />
        ))}
      </div>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
