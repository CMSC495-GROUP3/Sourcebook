import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import type { LibrarySummary } from '../../hooks/useLibrarySummary'

interface Props {
  library: LibrarySummary
}

/**
 * The facing page of the home view. The reading column is the book's left
 * page and the right margin is kept for the source pane, which docks there
 * once a citation is clicked. Before that the margin is blank, so on
 * windows wide enough to dock, this page fills it with a table of contents:
 * what can be asked about, the promise that every answer cites one of the
 * indexed policies, and the way into the library. Its header band is 60px
 * like every other band, and its body is ruled paper on the same 24px grid
 * as the sign-in page.
 */
export default function IndexedPage({ library }: Props) {
  const { total, categories } = library
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-15 shrink-0 items-center border-b border-rule px-6">
        <h2 id="library-heading" className="caps text-ink-3">
          In the library
        </h2>
      </header>
      <div className="ruled flex-1 px-6 pt-6 pb-12">
        {total != null && (
          <div className="flex max-w-100 flex-col">
            {/* A running head, not a second title: the left page already carries the
                question in the display face at 40px, so this is the same face in
                italic at 22px, and the entries below it are the substance. */}
            <h3 className="relative top-px font-display text-[22px] leading-6 font-normal text-ink-2 italic">
              Topics you can ask about
            </h3>
            {categories.length > 0 && (
              <ul className="mt-6 flex flex-col" aria-label="Categories">
                {categories.map((category) => (
                  <li key={category} className="leading-6">
                    <Link
                      to={`/documents?category=${encodeURIComponent(category)}`}
                      className="text-[15px] font-medium text-ink transition-colors hover:text-accent"
                    >
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-[14px] leading-6 text-ink-2">
              {total === 1 ? (
                <>Every answer cites the one policy indexed so far.</>
              ) : (
                <>
                  Every answer cites one of the <span className="tnum">{total}</span> policies indexed.
                </>
              )}
            </p>
            <Link
              to="/documents"
              className="inline-flex items-center gap-1.5 self-start text-[14px] leading-6 text-accent underline-offset-3 hover:text-accent-ink hover:underline"
            >
              <BookOpen size={14} aria-hidden="true" />
              Browse the library
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
