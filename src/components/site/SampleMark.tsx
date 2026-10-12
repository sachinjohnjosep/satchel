/** Flags seeded placeholder content so it is never mistaken for real work. */
export function SampleMark({ show, className = "" }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span className={`sample-mark ${className}`} title="Placeholder content. Replace it from the dashboard.">
      Sample
    </span>
  );
}
