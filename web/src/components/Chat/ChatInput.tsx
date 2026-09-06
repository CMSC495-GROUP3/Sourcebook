import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { GROUNDING_NOTE } from '../../config'

interface Props {
  onSend: (message: string) => void
  disabled: boolean
}

const MAX_HEIGHT_PX = 160

export default function ChatInput({ onSend, disabled }: Props) {
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

  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-2 px-3 pt-2 pb-3 sm:px-8 sm:pb-5">
      <div
        className={`flex items-end gap-2.5 rounded-xl border bg-paper-3 py-2.5 pr-2.5 pl-4 shadow-float transition-colors focus-within:border-accent ${
          disabled ? 'border-rule' : 'border-rule-strong'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask about a policy…"
          aria-label="Your question"
          rows={1}
          className="flex-1 resize-none bg-transparent py-1 text-[16px] leading-normal text-ink outline-none placeholder:text-ink-3 disabled:text-ink-3 sm:text-[15px]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg bg-ink text-paper transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:bg-rule disabled:text-ink-3"
        >
          <ArrowUp size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <p className="text-center text-[12px] text-ink-3" aria-live="polite">
        {disabled ? 'Answering…' : `Shift+Enter for a new line. ${GROUNDING_NOTE}`}
      </p>
    </div>
  )
}
