export function Footer() {
    return (
      <footer className="border-t bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div>© {new Date().getFullYear()} Ponimetsa Tall</div>
            <div>Reiu küla, Pärnumaa</div>
          </div>
        </div>
      </footer>
    );
  }