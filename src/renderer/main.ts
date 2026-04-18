import './styles.css'

declare global {
  interface Window {
    spotlight: {
      hide: () => void
      quit: () => void
      openDialog: (actionId: string) => void
      closeDialog: () => void
      launch: (appId: string) => void
      openUrl: (url: string) => void
    }
  }
}

type Action = { id: string; label: string; svg: string }

const ACTIONS: Action[] = [
  {
    id: 'apps',
    label: 'Applications',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8.2 17 3.4-7 .4-.7.4.7 3.4 7" />
      <path d="M9.6 14.2h4.8" />
    </svg>`,
  },
  {
    id: 'files',
    label: 'Files',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3.5 7.5a2 2 0 0 1 2-2h3.7l1.8 2H18.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" />
    </svg>`,
  },
  {
    id: 'stack',
    label: 'Stack',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3.5 3 8l9 4.5L21 8l-9-4.5Z" />
      <path d="m3 16 9 4.5L21 16" />
    </svg>`,
  },
  {
    id: 'docs',
    label: 'Documents',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
      <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
    </svg>`,
  },
]

type DialogItem = { name: string; meta: string; appId?: string; url?: string }
type DialogContent = { title: string; subtitle: string; items: DialogItem[] }

const DIALOG_CONTENT: Record<string, DialogContent> = {
  apps: {
    title: 'Applications',
    subtitle: 'Frequently used',
    items: [
      { name: 'Files', meta: 'Nautilus', appId: 'files' },
      { name: 'Google Chrome', meta: 'Browser', appId: 'chrome' },
      { name: 'Terminal', meta: 'GNOME Terminal', appId: 'terminal' },
      { name: 'Gmail', meta: 'mail.google.com', url: 'https://mail.google.com/' },
      { name: 'Google Calendar', meta: 'calendar.google.com', url: 'https://calendar.google.com/' },
      { name: 'Google Maps', meta: 'maps.google.com', url: 'https://maps.google.com/' },
      { name: 'LinkedIn', meta: 'linkedin.com', url: 'https://www.linkedin.com/' },
      { name: 'X', meta: 'x.com', url: 'https://x.com/' },
      { name: 'Rhythmbox', meta: 'Media', appId: 'rhythmbox' },
      { name: 'Settings', meta: 'GNOME Control Center', appId: 'settings' },
    ],
  },
  files: {
    title: 'Recent Files',
    subtitle: 'Last 24 hours',
    items: [
      { name: 'design-spec.pdf', meta: '2 hours ago' },
      { name: 'screenshot.png', meta: '5 hours ago' },
      { name: 'meeting-notes.md', meta: 'Yesterday' },
      { name: 'budget.xlsx', meta: 'Yesterday' },
    ],
  },
  stack: {
    title: 'Stack',
    subtitle: 'Open windows',
    items: [
      { name: 'spotlight — main.ts', meta: 'WebStorm' },
      { name: 'GitHub — pull requests', meta: 'Firefox' },
      { name: 'Inbox (3)', meta: 'Thunderbird' },
      { name: 'Home', meta: 'Files' },
    ],
  },
  docs: {
    title: 'Documents',
    subtitle: 'Pinned',
    items: [
      { name: 'Project README', meta: 'Markdown' },
      { name: 'Roadmap Q3', meta: 'Doc' },
      { name: 'Onboarding', meta: 'PDF' },
      { name: 'API notes', meta: 'Markdown' },
    ],
  },
}

const app = document.querySelector<HTMLDivElement>('#app')!
const params = new URLSearchParams(location.search)
const view = params.get('view')

if (view === 'dialog') {
  renderDialog(params.get('action') ?? 'apps')
} else {
  renderSpotlightBar()
}

function renderDialog(actionId: string): void {
  const content = DIALOG_CONTENT[actionId] ?? {
    title: actionId,
    subtitle: '',
    items: [],
  }

  app.innerHTML = `
    <div class="drag flex h-screen w-screen items-stretch p-3">
      <div class="no-drag relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-2xl">
        <div class="drag flex items-center justify-between border-b border-slate-200/70 px-5 py-3">
          <div class="min-w-0">
            <h2 class="truncate text-base font-semibold text-blue-950">${content.title}</h2>
            <p class="truncate text-xs text-slate-500">${content.subtitle}</p>
          </div>
          <button
            id="close"
            aria-label="Close"
            class="no-drag flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-blue-950/60 transition-colors hover:bg-slate-200/60 hover:text-blue-950"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <ul
          role="listbox"
          class="mx-3 mb-3 flex-1 space-y-1 overflow-y-auto rounded-lg border border-slate-200/80 p-2 shadow-sm"
        >
          ${content.items
            .map(
              (item) => {
                const attrs = [
                  item.appId ? `data-app-id="${escapeHtml(item.appId)}"` : '',
                  item.url ? `data-url="${escapeHtml(item.url)}"` : '',
                  'role="option"',
                  'tabindex="-1"',
                ].filter(Boolean).join(' ')
                return `
                <li
                  ${attrs}
                  class="cursor-pointer flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-sky-100/80 focus:bg-sky-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                >
                  <span class="truncate text-sm text-blue-950">${escapeHtml(item.name)}</span>
                  <span class="shrink-0 pl-3 text-xs text-slate-500">${escapeHtml(item.meta)}</span>
                </li>`
              }
            )
            .join('')}
        </ul>
        <div
          id="toast"
          role="status"
          aria-live="polite"
          class="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200"
        >
          Not implemented yet
        </div>
      </div>
    </div>
  `

  app.querySelector<HTMLButtonElement>('#close')!.addEventListener('click', () => {
    window.spotlight.closeDialog()
  })

  const items = Array.from(
    app.querySelectorAll<HTMLLIElement>('li[role="option"]')
  )
  const toast = app.querySelector<HTMLDivElement>('#toast')
  let toastTimer: number | null = null

  const showToast = (msg: string): void => {
    if (!toast) return
    toast.textContent = msg
    toast.classList.remove('opacity-0')
    if (toastTimer !== null) window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toast.classList.add('opacity-0')
    }, 1800)
  }

  const activateItem = (li: HTMLLIElement): void => {
    const appId = li.dataset['appId']
    const url = li.dataset['url']
    if (appId) {
      window.spotlight.launch(appId)
    } else if (url) {
      window.spotlight.openUrl(url)
    } else {
      showToast('Not implemented yet')
    }
  }

  const focusItem = (index: number): void => {
    if (items.length === 0) return
    const wrapped = ((index % items.length) + items.length) % items.length
    items.forEach((el, i) => {
      el.tabIndex = i === wrapped ? 0 : -1
    })
    items[wrapped]?.focus()
  }

  items.forEach((li, index) => {
    li.addEventListener('click', () => activateItem(li))
    li.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusItem(index + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        focusItem(index - 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        focusItem(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        focusItem(items.length - 1)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        activateItem(li)
      }
    })
  })

  // Make the first interactive item the tabindex=0 anchor and focus it so
  // arrow-navigation works without an extra click.
  if (items.length > 0) {
    items[0]!.tabIndex = 0
    items[0]!.focus()
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      window.spotlight.closeDialog()
    }
  })
}

function renderSpotlightBar(): void {
  app.innerHTML = `
    <div class="drag flex h-screen items-center gap-4 px-5">
      <div class="drag flex w-[660px] shrink-0 items-center gap-4 rounded-full border border-white bg-white px-7 py-4 shadow-md">
        <svg class="h-7 w-7 shrink-0 text-blue-950/75" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
        <input
          id="search"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="Spotlight Search"
          class="no-drag min-w-0 flex-1 bg-transparent text-2xl font-light text-blue-950 placeholder-slate-600 outline-none"
        />
        <span
          id="hint"
          class="pointer-events-none flex shrink-0 select-none items-center gap-2 text-xs text-slate-400 transition-opacity duration-200"
        >
          <kbd class="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Tab</kbd>
          <span>for more</span>
        </span>
      </div>
      <div id="actions" class="flex shrink-0 items-center gap-3">
        ${ACTIONS.map(
          (a, i) => `
            <button
              data-action="${a.id}"
              aria-label="${a.label}"
              title="${a.label}"
              disabled
              class="no-drag pointer-events-none flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white bg-sky-200 text-blue-950 shadow-md transition-all duration-200 ease-out hover:scale-105 hover:bg-sky-300 focus:scale-105 focus:bg-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 active:scale-95 ${
                i === 0 ? 'peek-fade' : 'opacity-0 -translate-x-3'
              }"
            >
              <span class="block h-6 w-6">${a.svg}</span>
            </button>`
        ).join('')}
      </div>
    </div>
  `

  const input = app.querySelector<HTMLInputElement>('#search')!
  const hint = app.querySelector<HTMLElement>('#hint')!
  const actionsEl = app.querySelector<HTMLDivElement>('#actions')!
  const buttons = Array.from(
    actionsEl.querySelectorAll<HTMLButtonElement>('button[data-action]')
  )
  const ACTIONS_COUNT = buttons.length

  const updateHint = (): void => {
    const show = visibleCount === 0 && input.value === ''
    hint.classList.toggle('opacity-0', !show)
  }

  const COLLAPSE_DELAY_MS = 4000
  const STAGGER_MS = 90
  let visibleCount = 0
  let staggerTimer: number | null = null
  let collapseTimer: number | null = null

  const clearStagger = (): void => {
    if (staggerTimer !== null) {
      window.clearTimeout(staggerTimer)
      staggerTimer = null
    }
  }

  const setVisibleCount = (n: number): void => {
    n = Math.max(0, Math.min(ACTIONS_COUNT, n))
    if (n === visibleCount) return
    visibleCount = n
    buttons.forEach((btn, i) => {
      btn.classList.remove('opacity-0', '-translate-x-3', 'pointer-events-none', 'peek-fade')
      if (i < n) {
        // Fully revealed and interactive.
        btn.disabled = false
      } else if (i === n) {
        // Peek hint for the *next* hidden button — left-to-right fade.
        btn.classList.add('peek-fade', 'pointer-events-none')
        btn.disabled = true
      } else {
        // Further buttons are completely hidden.
        btn.classList.add('opacity-0', '-translate-x-3', 'pointer-events-none')
        btn.disabled = true
      }
    })
    if (n > 0) {
      resetCollapseTimer()
    } else if (collapseTimer !== null) {
      window.clearTimeout(collapseTimer)
      collapseTimer = null
    }
    updateHint()
  }

  const revealNext = (): void => {
    clearStagger()
    if (visibleCount >= ACTIONS_COUNT) return
    setVisibleCount(visibleCount + 1)
    if (visibleCount < ACTIONS_COUNT) {
      staggerTimer = window.setTimeout(revealNext, STAGGER_MS)
    }
  }

  const collapseNext = (): void => {
    clearStagger()
    if (visibleCount <= 0) return
    setVisibleCount(visibleCount - 1)
    if (visibleCount > 0) {
      staggerTimer = window.setTimeout(collapseNext, STAGGER_MS)
    }
  }

  function resetCollapseTimer(): void {
    if (collapseTimer !== null) window.clearTimeout(collapseTimer)
    collapseTimer = window.setTimeout(collapseNext, COLLAPSE_DELAY_MS)
  }

  actionsEl.addEventListener('mousemove', resetCollapseTimer)
  actionsEl.addEventListener('mouseenter', resetCollapseTimer)
  input.addEventListener('input', () => {
    if (visibleCount > 0) resetCollapseTimer()
    updateHint()
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      clearStagger()
      if (visibleCount === 0) {
        // First Tab: reveal the first button, focus stays on input.
        setVisibleCount(1)
      } else {
        // Subsequent Tab from input: move focus into the visible buttons.
        buttons[0]?.focus()
        resetCollapseTimer()
      }
      return
    }
    if (e.key === 'Tab' && e.shiftKey && visibleCount > 0) {
      e.preventDefault()
      clearStagger()
      setVisibleCount(visibleCount - 1)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      if (visibleCount > 0) {
        collapseNext()
      } else if (input.value) {
        input.value = ''
      } else {
        window.spotlight.hide()
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const query = input.value.trim()
      if (query) {
        console.log('search', query)
        window.spotlight.hide()
      }
    }
  })

  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset['action']
      if (!id) return
      window.spotlight.openDialog(id)
      resetCollapseTimer()
    })
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        input.focus()
        collapseNext()
        return
      }
      if (e.key === 'ArrowRight' && index < visibleCount - 1) {
        e.preventDefault()
        buttons[index + 1]?.focus()
        resetCollapseTimer()
        return
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault()
        buttons[index - 1]?.focus()
        resetCollapseTimer()
        return
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        clearStagger()
        if (visibleCount > index + 1) {
          // Next button is already revealed → just move focus to it.
          buttons[index + 1]?.focus()
          resetCollapseTimer()
        } else if (visibleCount < ACTIONS_COUNT) {
          // Reveal the next hidden button; focus stays on the current one.
          setVisibleCount(visibleCount + 1)
        }
        // else: at the very last button with all revealed — stay put.
        return
      }
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        clearStagger()
        if (visibleCount > index + 1) {
          // A revealed-but-unfocused button exists to the right → un-reveal it.
          setVisibleCount(visibleCount - 1)
        } else if (index > 0) {
          buttons[index - 1]?.focus()
          resetCollapseTimer()
        } else {
          input.focus()
          resetCollapseTimer()
        }
      }
    })
  })

  const SHAKE_REVERSAL_GAP_MAX_MS = 120
  const SHAKE_REVERSAL_WINDOW_MS = 700
  const SHAKE_MIN_VELOCITY = 0.4
  const SHAKE_REVERSALS_TO_TRIGGER = 4

  let lastX: number | null = null
  let lastT = 0
  let lastDir = 0
  let reversals = 0
  let firstReversalAt = 0

  window.addEventListener('mousemove', (e) => {
    if (visibleCount >= ACTIONS_COUNT) return
    const now = performance.now()
    if (lastX === null) {
      lastX = e.clientX
      lastT = now
      return
    }
    const dx = e.clientX - lastX
    const dt = now - lastT
    lastX = e.clientX
    lastT = now
    if (dt === 0) return
    if (dt > SHAKE_REVERSAL_GAP_MAX_MS) {
      lastDir = 0
      reversals = 0
      return
    }
    const velocity = Math.abs(dx) / dt
    if (velocity < SHAKE_MIN_VELOCITY) return
    const dir = Math.sign(dx)
    if (dir === 0 || dir === lastDir) return
    if (lastDir !== 0) {
      if (reversals === 0 || now - firstReversalAt > SHAKE_REVERSAL_WINDOW_MS) {
        reversals = 1
        firstReversalAt = now
      } else {
        reversals++
      }
      if (reversals >= SHAKE_REVERSALS_TO_TRIGGER) {
        revealNext()
        reversals = 0
      }
    }
    lastDir = dir
  })

  window.addEventListener('focus', () => input.focus())
  input.focus()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
