/**
 * EscalationsPage — the Human Resources queue, laid out like the Policy
 * Library: the list beside the open request at `lg`, taking turns below it.
 * A handler reads what the employee asked and was told, then resolves the
 * request with a note, reopens it, or sends a webhook delivery that failed or
 * never went out. The same operations exist as API routes; see docs/api.md.
 *
 * The URL carries what a link needs to reproduce: ?status=resolved picks the
 * tab (open is the default), and ?id= the open request. A linked request that
 * is not on the current list page is fetched on its own, so a link from a
 * webhook message opens the right request whatever tab it lands on.
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Inbox } from 'lucide-react'
import {
  getEscalation,
  getEscalations,
  updateEscalation,
  retryEscalationDelivery,
  escalationErrorMessage,
} from '../api/escalations'
import EscalationDetail, { type EscalationAction } from '../components/Escalations/EscalationDetail'
import EscalationListItem from '../components/Escalations/EscalationListItem'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { READING_COLUMN, READING_GUTTER } from '../lib/layout'
import type { Escalation, EscalationStatus } from '../types'

/** Tailwind's `lg`, the same breakpoint as the Policy Library. */
const TWO_PANE_QUERY = '(min-width: 1024px)'
const NO_ITEMS: Escalation[] = []
const TABS: { status: EscalationStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'resolved', label: 'Resolved' },
]

/** What the last list fetch returned, and for which tab. */
interface ListState {
  status: EscalationStatus
  items: Escalation[]
  /** The list returns at most 50 items; `total` is the full count for the tab. */
  total: number
  error: boolean
}

/** A request named by ?id= that the current list page does not contain. */
interface Linked {
  id: string
  escalation: Escalation | null
}

export default function EscalationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status: EscalationStatus = searchParams.get('status') === 'resolved' ? 'resolved' : 'open'
  const linkedId = searchParams.get('id')
  const twoPane = useMediaQuery(TWO_PANE_QUERY)

  const [list, setList] = useState<ListState | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [linked, setLinked] = useState<Linked | null>(null)
  const [action, setAction] = useState<EscalationAction | null>(null)
  // Tied to the request it came from, so opening another one hides it.
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null)

  // A request just resolved or reopened has left this tab. React Router
  // commits the URL change in a transition, after the state updates below, so
  // for a render the URL still names it. Treat it as closed until the URL
  // moves on, or the page would fetch it by id or auto-select it again.
  const [closedId, setClosedId] = useState<string | null>(null)
  if (closedId !== null && linkedId !== closedId) setClosedId(null)
  const selectedId = linkedId === closedId ? null : linkedId

  // Back and Forward change the tab through the URL, so loading is derived
  // from which tab the list holds rather than set by the click.
  const loaded = list !== null && list.status === status
  const items = useMemo(
    () => (loaded ? list.items.filter((escalation) => escalation.escalation_id !== closedId) : NO_ITEMS),
    [loaded, list, closedId],
  )

  useEffect(() => {
    let cancelled = false
    getEscalations(status)
      .then((data) => {
        if (!cancelled) setList({ status, items: data.items, total: data.total, error: false })
      })
      .catch(() => {
        if (!cancelled) setList({ status, items: [], total: 0, error: true })
      })
    return () => {
      cancelled = true
    }
  }, [status, reloadKey])

  const inList = items.find((escalation) => escalation.escalation_id === selectedId) ?? null
  const selected = inList ?? (linked?.id === selectedId ? linked.escalation : null)

  useEffect(() => {
    if (!selectedId || !loaded || inList || linked?.id === selectedId) return
    let cancelled = false
    getEscalation(selectedId)
      .then((escalation) => {
        if (!cancelled) setLinked({ id: selectedId, escalation })
      })
      .catch(() => {
        if (!cancelled) setLinked({ id: selectedId, escalation: null })
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, loaded, inList, linked])

  // Two panes with nothing on the right is a wasted page. Open the newest
  // request when the URL names none. Replaced, so Back skips it.
  const newestId = items[0]?.escalation_id
  useEffect(() => {
    if (!twoPane || selectedId || !newestId) return
    const next = new URLSearchParams(searchParams)
    next.set('id', newestId)
    setSearchParams(next, { replace: true })
  }, [twoPane, selectedId, newestId, searchParams, setSearchParams])

  function select(escalationId: string | null) {
    // Re-clicking the open row would only add a history entry for Back to walk.
    if (escalationId === selectedId) return
    const next = new URLSearchParams(searchParams)
    if (escalationId) next.set('id', escalationId)
    else next.delete('id')
    setSearchParams(next)
  }

  function changeStatus(nextStatus: EscalationStatus) {
    if (nextStatus === status) return
    const next = new URLSearchParams(searchParams)
    if (nextStatus === 'open') next.delete('status')
    else next.set('status', nextStatus)
    next.delete('id')
    setSearchParams(next, { replace: true })
  }

  /** After resolve or reopen the request leaves this tab: close it and refetch. */
  function closeAndReload(id: string) {
    setClosedId(id)
    setLinked(null)
    const next = new URLSearchParams(searchParams)
    next.delete('id')
    setSearchParams(next, { replace: true })
    setReloadKey((key) => key + 1)
  }

  function replaceRecord(updated: Escalation) {
    const swap = (escalation: Escalation) =>
      escalation.escalation_id === updated.escalation_id ? updated : escalation
    setList((current) => (current ? { ...current, items: current.items.map(swap) } : current))
    setLinked((current) =>
      current?.id === updated.escalation_id ? { ...current, escalation: updated } : current,
    )
  }

  async function run(kind: EscalationAction, fallback: string, work: (id: string) => Promise<void>) {
    if (!selected) return
    const id = selected.escalation_id
    setAction(kind)
    setActionError(null)
    try {
      await work(id)
    } catch (error) {
      setActionError({ id, message: escalationErrorMessage(error, fallback) })
    } finally {
      setAction(null)
    }
  }

  const handleResolve = (resolution: string) =>
    run('resolve', 'Unable to resolve this request.', async (id) => {
      await updateEscalation(id, 'resolved', resolution)
      closeAndReload(id)
    })

  const handleReopen = () =>
    run('reopen', 'Unable to reopen this request.', async (id) => {
      await updateEscalation(id, 'open')
      closeAndReload(id)
    })

  const handleRetry = () =>
    run('retry', 'Unable to retry delivery.', async (id) => {
      const updated = await retryEscalationDelivery(id)
      replaceRecord(updated)
      if (updated.delivery_status !== 'delivered') {
        setActionError({ id, message: 'Delivery was retried and failed again.' })
      }
    })

  const shownTotal = loaded ? list.total - (list.items.length - items.length) : 0
  const count = !loaded ? 'Loading…' : list.error ? '' : `${shownTotal} ${status}`

  const listPane = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-15 shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 pt-[19px]">
        <h1 className="font-display text-[22px] leading-none font-medium tracking-tight text-ink">
          HR Requests
        </h1>
        <span className="tnum text-[12.5px] text-ink-2" aria-live="polite">{count}</span>
      </header>
      <div className="flex gap-1.5 px-5 pt-4 pb-3" role="group" aria-label="Filter by status">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            onClick={() => changeStatus(tab.status)}
            aria-pressed={tab.status === status}
            className={`h-7 cursor-pointer rounded-full border px-3 text-[12.5px] transition-colors ${
              tab.status === status
                ? 'border-accent bg-accent text-paper'
                : 'border-rule bg-paper-3 text-ink-2 hover:border-ink-3 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6 sm:px-3">
        {loaded && list.error ? (
          <div className="px-3">
            <p role="alert" className="text-[14px] text-brick">Unable to load HR requests.</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-2 cursor-pointer text-[13px] font-medium text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        ) : loaded && items.length === 0 ? (
          <p className="px-3 text-[14px] text-ink-2">
            {status === 'open'
              ? 'No open requests. Employee escalations that need Human Resources will appear here.'
              : 'No resolved requests yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((escalation) => (
              <EscalationListItem
                key={escalation.escalation_id}
                escalation={escalation}
                selected={escalation.escalation_id === selectedId}
                onSelect={select}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  let detailBody: React.ReactNode
  if (selected) {
    detailBody = (
      <EscalationDetail
        key={selected.escalation_id}
        escalation={selected}
        action={action}
        actionError={actionError?.id === selected.escalation_id ? actionError.message : null}
        onResolve={handleResolve}
        onReopen={handleReopen}
        onRetry={handleRetry}
      />
    )
  } else if (selectedId && linked?.id === selectedId) {
    detailBody = <p className="text-[14px] text-ink-2">That request was not found.</p>
  } else if (selectedId) {
    detailBody = <p className="text-[14px] text-ink-3">Loading…</p>
  }

  const detailPane = detailBody ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex h-15 shrink-0 items-center gap-4 border-b border-rule ${READING_GUTTER}`}>
        {twoPane ? (
          <span className="caps text-ink-3">HR request</span>
        ) : (
          <button
            type="button"
            onClick={() => select(null)}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All requests
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={`${READING_GUTTER} py-7 sm:py-8`}>
          <div className={READING_COLUMN}>{detailBody}</div>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <Inbox size={28} strokeWidth={1.5} aria-hidden="true" className="text-ink-3" />
      <p className="max-w-80 text-[14px] leading-normal text-ink-2">
        {loaded && items.length === 0 ? 'Nothing to review.' : 'Pick a request to review it.'}
      </p>
    </div>
  )

  if (!twoPane) {
    return <div className="min-h-0 flex-1">{selectedId ? detailPane : listPane}</div>
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[400px_minmax(0,1fr)]">
      <div className="min-h-0 border-r border-rule bg-paper-2">{listPane}</div>
      <div className="min-h-0 bg-paper">{detailPane}</div>
    </div>
  )
}
