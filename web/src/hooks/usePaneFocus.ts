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
 * A row that is not in the list (an item linked from another tab, say) falls
 * back to the list's heading. An item that leaves the list (resolved, say)
 * has no row to return to, in either layout: call `focusListWhenClosed(id)`
 * before closing it, or `focusList()` when it leaves while the list is
 * already on screen, and focus goes to the list's heading.
 *
 * Attach `listRef` around the list, whose heading is its <h1> and whose rows
 * carry `data-row-id`, and `detailRef` around the open item, whose heading is
 * its first <h2>, or an element marked `data-pane-focus` when the item could
 * not be shown. Each of these needs `tabIndex={-1}` unless it is a control.
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
    // A target from an earlier navigation that never found its element must
    // not fire later, when the user has moved on.
    pending.current = null
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

  const focusList = useCallback(() => {
    listRef.current?.querySelector<HTMLElement>('h1')?.focus()
  }, [])

  return { listRef, detailRef, focusListWhenClosed, focusList }
}

function findTarget(target: Target, list: HTMLElement | null, detail: HTMLElement | null) {
  if (target.kind === 'detail') {
    return detail?.querySelector<HTMLElement>('h2, [data-pane-focus]') ?? null
  }
  const heading = list?.querySelector<HTMLElement>('h1') ?? null
  if (target.kind === 'list') return heading
  // The list is kept across the pane switch, so on the first render with the
  // list on screen the row is there if it will be at all.
  const rows = list?.querySelectorAll<HTMLElement>('[data-row-id]') ?? []
  return Array.from(rows).find((row) => row.dataset.rowId === target.id) ?? heading
}
