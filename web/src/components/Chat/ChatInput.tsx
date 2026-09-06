import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

interface Props {
  onSend: (message: string) => void
  disabled: boolean
  /**
   * `hero` is the large box on the home page before any question is asked.
   * `composer` is the compact bar under a conversation.
   */
  variant?: 'hero' | 'composer'
}

const MAX_HEIGHT_PX = 200

export default function ChatInput({ onSend, disabled, variant = 'composer' }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const canSend = !disabled && value.trim().length > 0
  const boxClass = `rounded-xl border bg-paper-3 shadow-float transition-colors focus-within:border-accent ${
    disabled ? 'border-rule' : 'border-rule-strong'
  }`
  const button = (
    <button
      type="button"
      onClick={submit}
      disabled={!canSend}
      aria-label="Ask"
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-ink text-paper transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:bg-rule disabled:text-ink-3"
    >
      <ArrowUp size={18} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  // The big box: the text sits on top and a footer row carries the hint and
  // the button, so nothing has to line up with a growing textarea.
  if (variant === 'hero') {
    return (
      <div className={boxClass}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoFocus
          placeholder="Ask about time off, benefits, expenses, equipment…"
          aria-label="Your question"
          rows={2}
          className="block w-full resize-none bg-transparent px-4 pt-4 pb-1 text-[17px] leading-relaxed text-ink outline-none placeholder:text-ink-3 disabled:text-ink-3"
        />
        <div className="flex h-14 items-center justify-between gap-3 pr-2.5 pl-4">
          <p className="text-[12px] text-ink-3 pointer-coarse:invisible" aria-live="polite">
            {disabled ? 'Answering…' : 'Enter to ask · Shift+Enter for a new line'}
          </p>
          {button}
        </div>
      </div>
    )
  }

  // The compact bar: one line tall at rest, textarea and button on one axis,
  // and the button stays on the last line as the text grows.
  return (
    <div className={`${boxClass} flex items-end gap-2 py-2.5 pr-2.5 pl-4`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? 'Answering…' : 'Ask a follow-up…'}
        aria-label="Your question"
        rows={1}
        className="block min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[16px] leading-6 text-ink outline-none placeholder:text-ink-3 disabled:text-ink-3 sm:text-[15px]"
      />
      {button}
    </div>
  )
}
