export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/75 backdrop-blur-sm dark-loading-overlay">
      <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-green-800 border-r-transparent" aria-hidden="true" />
        <p className="text-sm font-medium" role="status">Laadin…</p>
      </div>
    </div>
  );
}
