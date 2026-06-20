export default function Loading() {
  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-28 animate-pulse rounded-lg bg-muted" key={index} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
        <div className="h-[34rem] animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
