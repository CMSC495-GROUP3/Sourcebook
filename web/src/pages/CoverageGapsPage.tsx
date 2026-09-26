/**
 * CoverageGapsPage, shown as "What People Ask": what employees asked that no
 * policy answered, and what they ask most. Both lists come from the query log
 * through GET /api/reports/gaps; nothing here identifies who asked.
 *
 * The copy says "not answered", as the chat's refusal card does ("Not answered
 * by any policy"), never "refused": the cause is a missing document, which HR
 * can write. The not-answered list is ochre, the refusal card's color. The
 * Asked most bars are green for answered asks with the not-answered share in
 * ochre at the end.
 *
 * ?days= picks the window (30 by default) so a link reproduces the view.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCoverageReport } from '../api/reports'
import { READING_COLUMN, READING_GUTTER } from '../lib/layout'
import type { CoverageReport, QuestionGroup } from '../types'

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]
const DEFAULT_DAYS = 30

/** What the last fetch returned, and for which window. */
interface ReportState {
  days: number
  report: CoverageReport | null
}

function readDays(value: string | null): number {
  const days = Number(value)
  return WINDOWS.some((option) => option.days === days) ? days : DEFAULT_DAYS
}

function plural(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`
}

/** "Asked once", "Asked 9 times". */
function timesAsked(count: number): string {
  return count === 1 ? 'Asked once' : `Asked ${count.toLocaleString()} times`
}

function QuestionText({ group }: { group: QuestionGroup }) {
  if (group.question) return <>{group.question}</>
  return <span className="text-ink-3 italic">No question text was logged</span>
}

/** A bar as wide as `count` is against the list's largest, split at `refused`. */
function Bar({ count, max, refused }: { count: number; max: number; refused: number }) {
  const answered = count - refused
  return (
    <span aria-hidden="true" className="mt-2 flex h-1 overflow-hidden rounded-full bg-rule/60">
      <span className="flex h-full" style={{ width: `${(count / max) * 100}%` }}>
        {answered > 0 && <span className="h-full bg-accent" style={{ flexGrow: answered }} />}
        {refused > 0 && <span className="h-full bg-ochre" style={{ flexGrow: refused }} />}
      </span>
    </span>
  )
}

interface Row {
  group: QuestionGroup
  refused: number
  meta: string
}

function RankedList({ rows, label }: { rows: Row[]; label: string }) {
  const max = Math.max(...rows.map((row) => row.group.count))
  return (
    <ol aria-label={label} className="mt-5 flex flex-col">
      {rows.map(({ group, refused, meta }, index) => (
        <li
          key={group.question_hash}
          className="grid grid-cols-[2rem_minmax(0,1fr)] border-t border-rule py-3.5 first:border-t-0 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
        >
          <span className="tnum pt-px font-display text-[15px] text-ink-3">{index + 1}</span>
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[15px] leading-snug text-ink">
                <QuestionText group={group} />
              </p>
              <span className="tnum shrink-0 text-[12.5px] text-ink-2">{meta}</span>
            </div>
            <Bar count={group.count} max={max} refused={refused} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function Section({
  title,
  caption,
  empty,
  rows,
}: {
  title: string
  caption: string
  empty: string
  rows: Row[]
}) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section aria-labelledby={id} className="mt-12 first:mt-0">
      <h2 id={id} className="font-display text-[19px] font-medium tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-1 text-[13.5px] leading-normal text-ink-2">{caption}</p>
      {rows.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-rule-strong px-4 py-5 text-[14px] text-ink-2">
          {empty}
        </p>
      ) : (
        <RankedList rows={rows} label={title} />
      )}
    </section>
  )
}

function Summary({ report, requested }: { report: CoverageReport; requested: number }) {
  const share = report.total ? Math.round((report.refused / report.total) * 100) : 0
  return (
    <div className="border-b border-rule pb-8">
      <p className="font-display text-[34px] leading-[1.1] font-medium tracking-tight text-ink sm:text-[40px]">
        <span className="tnum text-ochre-ink">{report.refused.toLocaleString()}</span>
        <span className="text-ink-3"> of </span>
        <span className="tnum">{report.total.toLocaleString()}</span>
      </p>
      <p className="mt-2 max-w-120 text-[14.5px] leading-normal text-ink-2">
        {report.total === 0
          ? `No questions were asked in the last ${report.days} days.`
          : `questions in the last ${report.days} days had no policy to answer them (${share}%).`}
      </p>
      {report.days < requested && (
        <p className="mt-2 max-w-120 text-[13px] leading-normal text-ink-3">
          The query log keeps {plural(report.days, 'day')} of questions, so this is the longest window there is.
        </p>
      )}
    </div>
  )
}

export default function CoverageGapsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const days = readDays(searchParams.get('days'))
  const [state, setState] = useState<ReportState | null>(null)
  const [failedDays, setFailedDays] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getCoverageReport(days)
      .then((report) => {
        if (cancelled) return
        setState({ days, report })
        setFailedDays(null)
      })
      .catch(() => {
        if (!cancelled) setFailedDays(days)
      })
    return () => {
      cancelled = true
    }
  }, [days, reloadKey])

  function changeWindow(next: number) {
    if (next === days) return
    const params = new URLSearchParams(searchParams)
    if (next === DEFAULT_DAYS) params.delete('days')
    else params.set('days', String(next))
    setSearchParams(params, { replace: true })
  }

  const failed = failedDays === days
  const report = state?.days === days ? state.report : null
  // The server shortens a window longer than the log's TTL; press the pill
  // for the window it ran, not the one asked for.
  const shownDays = report?.days ?? days

  let body: React.ReactNode
  if (failed) {
    body = (
      <div>
        <p role="alert" className="text-[14px] text-brick">Unable to load this report.</p>
        <button
          type="button"
          onClick={() => {
            setFailedDays(null)
            setReloadKey((key) => key + 1)
          }}
          className="mt-2 cursor-pointer text-[13px] font-medium text-accent hover:underline"
        >
          Try again
        </button>
      </div>
    )
  } else if (!report) {
    body = <p className="text-[14px] text-ink-3">Loading…</p>
  } else {
    body = (
      <>
        <Summary report={report} requested={days} />
        <div className="pt-10">
          <Section
            title="Not answered yet"
            caption="Questions no policy answered, most asked first. Each one points to a policy to write or make clearer."
            empty="Every question in this window had a policy to answer it."
            rows={report.gaps.map((group) => ({
              group,
              refused: group.count,
              meta: timesAsked(group.count),
            }))}
          />
          <Section
            title="Asked most"
            caption="Questions asked at least twice. The ochre end of each bar is the share no policy answered."
            empty="No question was asked more than once in this window."
            rows={report.faq.map((group) => ({
              group,
              refused: group.refused,
              meta: group.refused
                ? `${timesAsked(group.count)} · ${group.refused.toLocaleString()} not answered`
                : timesAsked(group.count),
            }))}
          />
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className={`flex min-h-15 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule py-3 ${READING_GUTTER}`}>
        <h1 className="font-display text-[22px] leading-none font-medium tracking-tight text-ink">
          What People Ask
        </h1>
        <div className="flex gap-1.5" role="group" aria-label="Time window">
          {WINDOWS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => changeWindow(option.days)}
              aria-pressed={option.days === shownDays}
              className={`h-7 cursor-pointer rounded-full border px-3 text-[12.5px] transition-colors ${
                option.days === shownDays
                  ? 'border-accent bg-accent text-paper'
                  : 'border-rule bg-paper-3 text-ink-2 hover:border-ink-3 hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={`${READING_GUTTER} py-8 sm:py-10`}>
          <div className={READING_COLUMN} aria-busy={!report && !failed}>
            {body}
          </div>
        </div>
      </div>
    </div>
  )
}
