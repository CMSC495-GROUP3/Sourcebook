import { APP_NAME } from '../../config'

interface MarkProps {
  size?: number
  className?: string
}

/**
 * The Sourcebook mark: the group's book-and-ribbon drawing, recolored to the
 * green accent. The file is public/icon.png; the smaller renditions next to
 * it are the browser tab and home-screen icons. docs/brand holds the source
 * and the original blue version.
 */
export function BrandMark({ size = 24, className = '' }: MarkProps) {
  return (
    <img
      src="/icon.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`shrink-0 select-none ${className}`}
    />
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
