export function AdminFeedback({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900 shadow-sm">
      <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-green-800 text-xs text-white">✓</span>
      {message}
    </div>
  );
}
