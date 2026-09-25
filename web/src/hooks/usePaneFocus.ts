import { useCallback, useEffect, useRef } from 'react'

type Target = { kind: 'detail' } | { kind: 'row'; id: string } | { kind: 'list' }

/**
 * Keeps keyboard focus in place when a list-and-detail page switches panes.
 *
 * Below `lg` the list and the open item replace each other, so the focused
 * element unmounts and focus would fall to <body>, sending a keyboard or
 * screen-reader user back to the top of the page. Opening an item focuses its
 * heading, and returning to the list focuses the row that was open, however
 * the URL changed: a click, Back, or a link. Beside each other at `lg` both
 * panes stay mounted, so a row click leaves focus on the row.
 *
 * An item that leaves the list (resolved, say) has no row to return to, in
 * either layout. Call `focusListWhenClosed(id)` before closing it, and focus
 * goes to the list's heading instead.
 *
 * Attach `listRef` around the list, whose heading is its <h1> and whose rows
 * carry `data-row-id`, and `detailRef` around the open item, whose heading is
 * its first <h2>. Both headings need `tabIndex={-1}`.
 */
export function usePaneFocus(selectedId: string | null, twoPane: boolean) {
  const listRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const pending = useRef<Target | null>(null)
  const previous = useRef(selectedId)
  const closing = useRef<string | null>(null)

  useEffect(() => {
    const prev = previous.current
    previous.current = selectedId
    if (prev === selectedId) return
    if (prev !== null && prev === closing.current) {
      closing.current = null
      pending.current = { kind: 'list' }
      return
    }
    if (twoPane) return
    if (selectedId) pending.current = { kind: 'detail' }
    else if (prev) pending.current = { kind: 'row', id: prev }
  }, [selectedId, twoPane])

  // The target may not exist on the render that asked for it: the item is
  // still loading, or Back has not landed yet. Try again after every render.
  useEffect(() => {
    const target = pending.current
    if (!target) return
    const element = findTarget(target, listRef.current, detailRef.current)
    if (element) {
      element.focus()
      pending.current = null
    }
  })

  const focusListWhenClosed = useCallback((id: string) => {
    closing.current = id
  }, [])

  return { listRef, detailRef, focusListWhenClosed }
}

function findTarget(target: Target, list: HTMLElement | null, detail: HTMLElement | null) {
  if (target.kind === 'detail') return detail?.querySelector<HTMLElement>('h2') ?? null
  if (target.kind === 'list') return list?.querySelector<HTMLElement>('h1') ?? null
  const rows = list?.querySelectorAll<HTMLElement>('[data-row-id]') ?? []
  return Array.from(rows).find((row) => row.dataset.rowId === target.id) ?? null
}
