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
 *
 * The ribbon rises out of the top of the square, so the book itself sits
 * below the centre of the image. The upward nudge puts the book's body, not
 * the bounding box, on the centre line of whatever row lays it out; it is a
 * share of the element's own height, so it scales with `size`.
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
      className={`shrink-0 -translate-y-[6%] select-none ${className}`}
    />
  )
}

/**
 * The product name set in the display face. Pair with BrandMark.
 *
 * Newsreader reserves deep descender space and the name has no descenders,
 * so with a tight line-height its letters sit above the centre of their
 * line box. The downward nudge, in em so it follows the font size, centres
 * the ink instead of the box. Transforms do nothing on a plain inline span,
 * hence inline-block, so the nudge holds outside a flex row too.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block font-display font-medium tracking-tight text-ink translate-y-[0.12em] select-none ${className}`}
    >
      {APP_NAME}
    </span>
  )
}
