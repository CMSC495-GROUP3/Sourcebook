/**
 * SourcesList — the policy documents an answer was drawn from, numbered like
 * footnotes. Open by default: the citations are the point of the product, so
 * they are visible without a click. Each one links to the Policy Library
 * filtered to that title, where the indexed passages can be read.
 */
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  sources: string[]
}

export default function SourcesList({ sources }: Props) {
  if (!sources.length) return null

  return (
    <Disclosure defaultOpen>
      {({ open }) => (
        <div className="flex flex-col gap-1.5">
          <DisclosureButton className="inline-flex cursor-pointer items-center gap-1.5 self-start text-[12.5px] text-ink-2 transition-colors hover:text-ink">
            <ChevronRight
              size={12}
              aria-hidden="true"
              className={`text-ink-3 transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
            />
            {sources.length} source{sources.length !== 1 ? 's' : ''}
          </DisclosureButton>
          <DisclosurePanel as="ol" className="flex flex-col gap-1">
            {sources.map((src, i) => (
              <li key={src} className="flex items-baseline gap-2.5 text-[13px]">
                <span className="tnum w-3.5 shrink-0 text-right text-ink-3" aria-hidden="true">
                  {i + 1}
                </span>
                <Link
                  to={`/documents?q=${encodeURIComponent(src)}`}
                  className="text-accent underline-offset-3 hover:text-accent-ink hover:underline"
                >
                  {src}
                </Link>
              </li>
            ))}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  )
}
