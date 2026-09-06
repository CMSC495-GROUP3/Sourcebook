import { APP_NAME } from '../../config'

interface MarkProps {
  size?: number
  className?: string
}

/**
 * The Sourcebook mark: an open book seen from above, with a reference dot
 * where a footnote marker sits. Same drawing as public/favicon.svg, in
 * theme colors so it follows the tokens.
 */
export function BrandMark({ size = 24, className = '' }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="7" className="fill-accent" />
      <g fill="none" className="stroke-paper-3" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 12.5c-2.6-2.4-6.4-2.8-9.5-1.6v13.6c3.1-1.2 6.9-.8 9.5 1.6" />
        <path d="M16 12.5c2.6-2.4 6.4-2.8 9.5-1.6v13.6c-3.1-1.2-6.9-.8-9.5 1.6" />
        <path d="M16 12.5v13.6" />
      </g>
      <circle cx="25.5" cy="6.5" r="2.25" className="fill-paper-3" />
    </svg>
  )
}

/** The product name set in the display face. Pair with BrandMark. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-medium tracking-tight text-ink select-none ${className}`}>
      {APP_NAME}
    </span>
  )
}
