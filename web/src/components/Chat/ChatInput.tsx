import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { GROUNDING_NOTE } from '../../config'

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
  const hero = variant === 'hero'

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

  return (
    <div className={hero ? 'flex flex-col gap-2.5' : 'mx-auto flex w-full max-w-190 flex-col gap-2 px-3 pt-2 pb-3 sm:px-8 sm:pb-5'}>
      <div
        className={`flex items-end gap-2.5 rounded-xl border bg-paper-3 shadow-float transition-colors focus-within:border-accent ${
          disabled ? 'border-rule' : 'border-rule-strong'
        } ${hero ? 'py-3.5 pr-3 pl-5' : 'py-2.5 pr-2.5 pl-4'}`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoFocus={hero}
          placeholder={hero ? 'Ask about time off, benefits, expenses, equipment…' : 'Ask a follow-up…'}
          aria-label="Your question"
          rows={hero ? 2 : 1}
          className={`flex-1 resize-none bg-transparent leading-normal text-ink outline-none placeholder:text-ink-3 disabled:text-ink-3 ${
            hero ? 'py-1 text-[17px]' : 'py-1 text-[16px] sm:text-[15px]'
          }`}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Ask"
          className={`flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-ink text-paper transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:bg-rule disabled:text-ink-3 ${
            hero ? 'h-10 w-10' : 'h-[34px] w-[34px]'
          }`}
        >
          <ArrowUp size={hero ? 20 : 18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <p className={`text-[12px] text-ink-3 ${hero ? '' : 'text-center'}`} aria-live="polite">
        {disabled ? 'Answering…' : `Enter to ask, Shift+Enter for a new line. ${GROUNDING_NOTE}`}
      </p>
    </div>
  )
}
