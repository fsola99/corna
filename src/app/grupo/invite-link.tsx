'use client'

import { useState } from 'react'

export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <input
        readOnly
        value={url}
        aria-label="Link de invitación"
        onFocus={(event) => event.currentTarget.select()}
        className="ink-flat bg-paper min-w-52 flex-1 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="ink-flat ink-press bg-paper font-head px-4 py-2 text-sm font-black tracking-[0.15em] uppercase"
      >
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
