import { useCallback, useRef, useState } from 'react'

/**
 * The current width of an element, from a ResizeObserver.
 *
 * `ref` is a callback ref, so the observer attaches whenever the element
 * mounts, including when it first appears after a conditional render. The
 * observer's first callback provides the initial value, so nothing is set
 * during render.
 */
export function useContainerWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    observerRef.current = observer
  }, [])

  return { ref, width }
}
