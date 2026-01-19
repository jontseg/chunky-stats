import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-card-border bg-card-bg mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏈</span>
            <span className="font-semibold text-primary">Chunky Stats</span>
          </div>

          <div className="flex flex-col items-center gap-2 text-sm text-muted sm:items-end">
            <p>
              Data provided by{" "}
              <a
                href="https://github.com/nflverse"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                nflverse
              </a>
            </p>
            <p>Updated Tuesdays & Fridays</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-muted">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/qb" className="hover:text-primary transition-colors">
            All QBs
          </Link>
        </div>

        <div className="mt-6 text-center text-xs text-muted">
          <p>
            &copy; {new Date().getFullYear()} Chunky Stats. Not affiliated with
            the NFL.
          </p>
        </div>
      </div>
    </footer>
  );
}
