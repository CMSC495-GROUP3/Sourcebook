import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { policiesIndexed, type LibrarySummary } from '../../hooks/useLibrarySummary'

interface Props {
  library: LibrarySummary
}

/**
 * The facing page of the home view. The reading column is the book's left
 * page and the right margin is kept for the source pane, which docks there
 * once a citation is clicked. Before that the margin is blank, so on
 * windows wide enough to dock, this page fills it with what the strip under
 * the examples would otherwise say: how much is indexed, and where to read
 * it. Its header band is 60px like every other band, and its body is ruled
 * paper on the same 24px grid as the sign-in page.
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
            <p className="relative top-[11px] font-display text-[32px] leading-12 font-medium tracking-tight text-ink">
              <span className="tnum">{total}</span> {policiesIndexed(total)}
            </p>
            {categories.length > 0 && (
              <ul className="mt-6 flex flex-col" aria-label="Categories">
                {categories.map((category) => (
                  <li key={category} className="leading-6">
                    <Link
                      to={`/documents?category=${encodeURIComponent(category)}`}
                      className="text-[14px] text-ink-2 transition-colors hover:text-ink"
                    >
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/documents"
              className="mt-6 inline-flex items-center gap-1.5 self-start text-[14px] leading-6 text-accent underline-offset-3 hover:text-accent-ink hover:underline"
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
