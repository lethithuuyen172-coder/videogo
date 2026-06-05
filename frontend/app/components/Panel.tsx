export function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-white p-4">
      {title ? <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2> : null}
      {children}
    </section>
  );
}
