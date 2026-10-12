export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-12 w-64 max-w-full animate-pulse bg-paper-deep" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse bg-paper-deep" />
        ))}
      </div>
    </div>
  );
}
