import axios from 'axios'
import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import client, { TOKEN_KEY } from '../../api/client'
import { APP_NAME, GROUNDING_NOTE } from '../../config'
import { BrandMark } from '../Layout/Brand'

interface Props {
  onSuccess: () => void
}

// Only a 401 means the password was wrong. A rate limit or a server-side
// configuration error must not be reported as one, or a locked-out admin
// would keep retrying a password that was never the problem.
function loginErrorMessage(err: unknown): string {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined
  if (status === 401) return 'Incorrect password.'
  if (status === 429) return 'Too many attempts. Wait a minute and try again.'
  return 'Sign-in is unavailable right now. Try again in a moment.'
}

export default function LoginForm({ onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/api/auth/login', { password })
      localStorage.setItem(TOKEN_KEY, res.data.access_token)
      onSuccess()
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ruled relative flex min-h-svh w-full flex-col items-center justify-center bg-paper px-4 py-16">
      <div className="flex w-full max-w-100 flex-col gap-7 rounded-xl border border-rule-strong bg-paper-3 p-7 shadow-card sm:p-10">
        <div className="flex flex-col gap-3.5">
          <BrandMark size={44} />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[34px] leading-none font-medium tracking-tight text-ink">{APP_NAME}</h1>
            <p className="text-[14.5px] text-ink-2">Enter the password to continue.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[12.5px] font-medium text-ink-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'password-error' : undefined}
              className="h-11 w-full rounded-md border border-rule-strong bg-paper px-3.5 text-[16px] text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none sm:text-[15px]"
            />
          </div>
          {error && (
            <p id="password-error" role="alert" className="flex items-center gap-1.5 text-[13px] text-brick">
              <AlertCircle size={14} aria-hidden="true" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-1 h-11 cursor-pointer rounded-md bg-ink text-[14.5px] font-medium text-paper transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:bg-rule disabled:text-ink-3"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      <p className="absolute bottom-8 px-4 text-center text-[12.5px] text-ink-3">{GROUNDING_NOTE}</p>
    </div>
  )
}
