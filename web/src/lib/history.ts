/**
 * History state for a list-and-detail page below `lg`, where the list and the
 * open item take turns on screen. An item opened by clicking its row carries
 * this state, which says the history entry behind it is that same list, so
 * leaving the item goes back through history instead of pushing the list
 * again. An item opened from a link has no such entry behind it.
 */
export const FROM_LIST = { fromList: true } as const

export function openedFromList(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { fromList?: unknown }).fromList === true
}
