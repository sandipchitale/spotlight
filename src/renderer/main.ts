import './styles.css'

declare global {
  interface Window {
    spotlight: {
      hide: () => void
      quit: () => void
      expand: () => void
      collapse: () => void
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
      <div class="no-drag flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-2xl">
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
        <ul class="flex-1 space-y-1 overflow-y-auto p-2">
          ${content.items
            .map(
              (item) => {
                const interactive = Boolean(item.appId || item.url)
                const attrs = [
                  item.appId ? `data-app-id="${escapeHtml(item.appId)}"` : '',
                  item.url ? `data-url="${escapeHtml(item.url)}"` : '',
                ].filter(Boolean).join(' ')
                return `
                <li
                  ${attrs}
                  class="${interactive ? 'cursor-pointer' : 'cursor-default'} flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-sky-100/80"
                >
                  <span class="truncate text-sm text-blue-950">${escapeHtml(item.name)}</span>
                  <span class="shrink-0 pl-3 text-xs text-slate-500">${escapeHtml(item.meta)}</span>
                </li>`
              }
            )
            .join('')}
        </ul>
      </div>
    </div>
  `

  app.querySelector<HTMLButtonElement>('#close')!.addEventListener('click', () => {
    window.spotlight.closeDialog()
  })

  app.querySelectorAll<HTMLLIElement>('li[data-app-id], li[data-url]').forEach((li) => {
    li.addEventListener('click', () => {
      const appId = li.dataset['appId']
      const url = li.dataset['url']
      if (appId) {
        window.spotlight.launch(appId)
      } else if (url) {
        window.spotlight.openUrl(url)
      }
    })
  })

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      window.spotlight.closeDialog()
    }
  })
}

function renderSpotlightBar(): void {
  app.innerHTML = `
    <div class="drag flex h-screen items-center gap-4 overflow-hidden px-5">
      <div class="drag flex w-[660px] shrink-0 items-center gap-4 rounded-full border border-white bg-white px-7 py-4 shadow-2xl">
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
      </div>
      <div id="actions" class="pointer-events-none flex shrink-0 -translate-x-3 items-center gap-3 opacity-0 transition-all duration-300 ease-out">
        ${ACTIONS.map(
          (a) => `
            <button
              data-action="${a.id}"
              aria-label="${a.label}"
              title="${a.label}"
              class="no-drag flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white bg-sky-200 text-blue-950 shadow-xl transition-all hover:scale-105 hover:bg-sky-300 focus:scale-105 focus:bg-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 active:scale-95"
            >
              <span class="block h-6 w-6">${a.svg}</span>
            </button>`
        ).join('')}
      </div>
    </div>
  `

  const input = app.querySelector<HTMLInputElement>('#search')!
  const actionsEl = app.querySelector<HTMLDivElement>('#actions')!

  const COLLAPSE_DELAY_MS = 4000
  let expanded = false
  let collapseTimer: number | null = null

  const resetCollapseTimer = (): void => {
    if (collapseTimer !== null) window.clearTimeout(collapseTimer)
    collapseTimer = window.setTimeout(collapse, COLLAPSE_DELAY_MS)
  }

  const expand = (): void => {
    if (expanded) return
    expanded = true
    window.spotlight.expand()
    requestAnimationFrame(() => {
      actionsEl.classList.remove('opacity-0', '-translate-x-3', 'pointer-events-none')
    })
    resetCollapseTimer()
  }

  function collapse(): void {
    if (!expanded) return
    expanded = false
    actionsEl.classList.add('opacity-0', '-translate-x-3', 'pointer-events-none')
    window.spotlight.collapse()
    if (collapseTimer !== null) {
      window.clearTimeout(collapseTimer)
      collapseTimer = null
    }
  }

  actionsEl.addEventListener('mousemove', resetCollapseTimer)
  actionsEl.addEventListener('mouseenter', resetCollapseTimer)
  input.addEventListener('input', () => {
    if (expanded) resetCollapseTimer()
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      if (!expanded) {
        expand()
      } else {
        const firstBtn = actionsEl.querySelector<HTMLButtonElement>('button[data-action]')
        firstBtn?.focus()
        resetCollapseTimer()
      }
      return
    }
    if (e.key === 'Tab' && e.shiftKey && expanded) {
      e.preventDefault()
      collapse()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      if (expanded) {
        collapse()
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

  const actionButtons = Array.from(
    actionsEl.querySelectorAll<HTMLButtonElement>('button[data-action]')
  )
  actionButtons.forEach((btn, index) => {
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
        collapse()
      } else if (e.key === 'Tab' && e.shiftKey && index === 0) {
        e.preventDefault()
        input.focus()
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
    if (expanded) return
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
        expand()
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
