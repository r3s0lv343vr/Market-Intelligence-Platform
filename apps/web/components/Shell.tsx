import Link from "next/link";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-panel/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            Market Intelligence
          </Link>
          <nav className="flex items-center gap-4 text-sm text-mute">
            <Link href="/" className="hover:text-ink">
              Research
            </Link>
            <Link href="/admin" className="hover:text-ink">
              Data status
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
