# Spotlight

A macOS Spotlight–style launcher for Linux, built with **Electron**, **Vite**, and **Tailwind CSS v4**.

A frameless, transparent, always-on-top window renders a horizontal pill-shaped search field with a progressive-disclosure row of four circular quick-action buttons. Each button opens a themed popup dialog from which you can launch native Linux apps or open web destinations in your default browser. The bar is summoned system-wide via `Ctrl+Alt+Space` — first press cold-starts and keeps the process resident, subsequent presses toggle visibility in ~5 ms via a POSIX signal.

![Spotlight bar](screenshots/spotlight.png)

## Features

### Visual / layout

- Frameless, transparent, always-on-top window (uses XWayland on Wayland sessions so transparency works)
- Fixed window width — 1000 px by 110 px, centered on the primary display
- A white pill input (660 px × ~60 px, `shadow-md`) and four 56 px sky-blue circular action buttons to the right
- Opaque surfaces throughout (`bg-white`, `bg-sky-200`); empty window area is transparent so the desktop shows through
- High-contrast placeholder (`text-slate-600`) and dark-navy icons
- Subtle `[Tab] for more` hint inside the pill, to the right of the input

### Progressive disclosure

- Initially only the pill is visible. The "next hidden" button is shown behind a smooth left-to-right gradient mask as a peek hint.
- **Shake the mouse** over the bar → cascading reveal of all four buttons (each appears ~90 ms after the previous)
- **Tab** alternates **reveal → focus → reveal → focus**:

  | Before Tab (count, focus) | After Tab |
  |---|---|
  | (0, input) | (1, input) — reveal #1 |
  | (1, input) | (1, btn0) — focus #1 |
  | (1, btn0) | (2, btn0) — reveal #2 |
  | (2, btn0) | (2, btn1) — focus #2 |
  | … | … |
  | (4, btn3) | stays |

- **Shift+Tab** mirrors the sequence in reverse (hide/focus-back alternation)
- **←** / **→** on a focused button walk between *revealed* buttons only (WAI-ARIA toolbar pattern)
- **Esc** on input cascades collapse → clear input → hide window (in that order)
- Auto-collapse 4 s after the last interaction

### Action dialogs

- Clicking a button opens a small themed popup (480 × 520 px, `rounded-2xl`, `bg-white`, `shadow-2xl`) just below the bar
- List inside the dialog has its own faint `border-slate-200/80 shadow-sm` inset
- Roving-tabindex listbox: first item auto-focuses on open, **↑** / **↓** wrap, **Home** / **End** jump, **Enter** / **Space** activate, **Esc** or close-icon dismiss
- Click-outside (`blur`) closes the dialog

### Behavior

- **Resident process**: after first launch the app stays in memory; subsequent activations show/hide via `SIGUSR1` (~5 ms vs. ~1 s cold start)
- **Single-instance lock** — double presses can't spawn duplicate popups
- **Launch native Linux apps** (with fallback chains for alternate distros):
  Files (Nautilus → Nemo → Dolphin → Thunar → `xdg-open ~`), Google Chrome, Terminal (Ptyxis → GNOME Terminal → Konsole → xfce4-terminal → xterm), Rhythmbox, Settings (GNOME Control Center)
- **Open web destinations** in the default browser via `shell.openExternal`:
  Gmail, Google Calendar, Google Maps, LinkedIn, X
- After launching an app or opening a URL, the window hides but the process stays resident

## Keyboard shortcuts

**System-wide** (via GNOME custom keybinding):

| Shortcut | Action |
|---|---|
| **Ctrl+Alt+Space** | Toggle the Spotlight window from anywhere |

**Focus on the search input:**

| Shortcut | Action |
|---|---|
| **Tab** | Reveal next hidden button, or focus first revealed button (alternating) |
| **Shift+Tab** | Un-reveal last revealed button, or move focus to input (mirror of Tab) |
| **Esc** | Cascade-collapse buttons → clear input → hide window |
| **Enter** | Submit query (logged to console) |

**Focus on a revealed button:**

| Shortcut | Action |
|---|---|
| **Tab** | Reveal next hidden button (focus stays), or focus next revealed button |
| **Shift+Tab** | Un-reveal next hidden, or focus previous button / input |
| **←** / **→** | Walk between revealed buttons (no wrap, doesn't reveal) |
| **Enter** / **Space** | Open the button's popup dialog |
| **Esc** | Refocus input + cascade-collapse |

**Inside a popup dialog:**

| Shortcut | Action |
|---|---|
| **↑** / **↓** | Move selection (wraps) |
| **Home** / **End** | Jump to first / last item |
| **Enter** / **Space** | Activate (launch app or open URL) |
| **Esc** or close icon | Dismiss |

## Drag region CSS

The two classes in `src/renderer/styles.css` control which parts grab the window:

```css
.drag {
  -webkit-app-region: drag;
  user-select: none;
  -webkit-user-select: none;
}

.no-drag {
  -webkit-app-region: no-drag;
}
```

The outer flex container, the pill body, and the dialog header are `.drag`. The `<input>`, the four action buttons, the dialog close button, and the list items are `.no-drag`.

## Peek-fade CSS

The "next hidden" button is rendered with a gradient mask so only its left edge peeks out, gradually fading to transparent:

```css
.peek-fade {
  -webkit-mask-image: linear-gradient(to right, black 0%, transparent 30%);
          mask-image: linear-gradient(to right, black 0%, transparent 30%);
  transition-property: opacity, transform, mask-image, -webkit-mask-image, background-color;
}
```

## Project layout

```
spotlight/
├── index.html                # Vite renderer entry (serves bar + dialog views via ?view= query)
├── package.json              # npm scripts + electron-builder config
├── tsconfig.json
├── vite.config.ts            # Vite + Tailwind v4 + vite-plugin-electron
├── icons/
│   └── spotlight512x512.png  # App icon (window + AppImage + .desktop)
├── bin/
│   └── spotlight-trigger     # POSIX trigger — sends SIGUSR1 if alive, else launches
├── screenshots/
│   └── spotlight.png         # README screenshot
└── src/
    ├── spotlight.ts          # Electron main process
    ├── preload.ts            # contextBridge → window.spotlight
    └── renderer/
        ├── main.ts           # Bar UI + dialog UI + shake detection + keyboard
        └── styles.css        # Tailwind + drag/no-drag + peek-fade
```

Build outputs (gitignored):

- `dist/` — bundled renderer (HTML / JS / CSS)
- `dist-electron/` — bundled main + preload scripts
- `release/` — packaged AppImage from electron-builder

## Getting started

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite dev server and launches Electron with hot-reload for the renderer. Saving `src/spotlight.ts` or `src/preload.ts` restarts Electron automatically.

### Production build

```bash
npm run build       # bundles renderer + main into dist/ and dist-electron/
npm start           # runs Electron against the bundled output
```

### Packaging an AppImage

```bash
npm run dist
```

Runs `vite build` then `electron-builder --linux --x64`, emitting `release/Spotlight-0.0.1-x86_64.AppImage`. First run downloads ~80–100 MB of Electron + appimagetool into `~/.cache/electron*`; subsequent builds are much faster.

## Installing as a GNOME application

### Desktop entry

`~/.local/share/applications/spotlight.desktop`:

```ini
[Desktop Entry]
Type=Application
Version=1.0
Name=Spotlight
GenericName=Quick Launcher
Comment=macOS Spotlight-style quick launcher
Exec=/path/to/spotlight/release/Spotlight-0.0.1-x86_64.AppImage %U
Icon=/path/to/spotlight/icons/spotlight512x512.png
Terminal=false
Categories=System;Utility;
StartupWMClass=Spotlight
StartupNotify=true
Keywords=launcher;spotlight;search;quick;
```

After creating it:

```bash
chmod +x ~/.local/share/applications/spotlight.desktop
update-desktop-database ~/.local/share/applications/
```

### Global keybinding (Ctrl+Alt+Space → trigger script)

GNOME's settings-daemon owns the binding so it works on both Wayland and X11:

```bash
SPOT=/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/spotlight/

# Append to existing custom bindings (don't clobber them!)
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings \
    "[$(gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings | tr -d '[]'), '$SPOT']"

gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$SPOT" name 'Spotlight'
gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$SPOT" command '/path/to/spotlight/bin/spotlight-trigger'
gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$SPOT" binding '<Control><Alt>space'
```

`Ctrl+Space`, `Super+Space`, and `Shift+Super+Space` are commonly bound by IBus / GNOME for input-source switching, which is why `Ctrl+Alt+Space` was chosen.

## Architecture

### Process model

- **Main process** (`src/spotlight.ts`) creates the frameless transparent `BrowserWindow`, opens the popup dialog as a child `BrowserWindow`, writes a PID file on startup, handles `SIGUSR1` for instant re-show, launches native apps via `child_process.spawn`, and opens URLs via `shell.openExternal`.
- **Preload** (`src/preload.ts`) exposes a small `window.spotlight` API via `contextBridge` (`contextIsolation: true`, `nodeIntegration: false`): `hide`, `quit`, `openDialog`, `closeDialog`, `launch`, `openUrl`.
- **Renderer** (`src/renderer/main.ts`) reads `?view=` from the URL and renders either the bar UI (default) or the dialog UI. It owns keyboard handlers, mouse-shake detection, progressive-disclosure state, and the dialog listbox.

### Progressive disclosure (all-CSS)

Since the window is transparent, there's no benefit to resizing it per step. The window stays a fixed 1000 px wide; the renderer tracks a single `visibleCount` (0–4) and updates each button's state:

| `i` | State when `i < count` | when `i === count` | when `i > count` |
|---|---|---|---|
| classes | (none — fully revealed) | `peek-fade pointer-events-none` | `opacity-0 -translate-x-3 pointer-events-none` |
| `disabled` | `false` | `true` | `true` |

All transitions are pure CSS (`transition-all duration-200 ease-out`), so they're GPU-accelerated and never feel jittery.

### Mouse-shake detector

Tracks `mousemove`, computes velocity (`dx/dt`), and counts direction reversals. Four reversals inside 700 ms that exceed 0.4 px/ms triggers a cascading `revealNext()` — each subsequent button appears 90 ms after the previous.

### Single-instance + signal trigger (fast launch)

- The Electron process calls `app.requestSingleInstanceLock()` and writes its PID to `$XDG_RUNTIME_DIR/spotlight.pid`.
- `process.on('SIGUSR1', toggleWindow)` — an external process can re-show the window without paying cold-start cost.
- `bin/spotlight-trigger` is a ~10-line POSIX script: if the PID file points to a live process it `kill -USR1`s it; otherwise it `exec`s the AppImage.
- The GNOME shortcut runs the trigger, not the AppImage directly. First press = cold start (~500–1500 ms); every subsequent press = ~5–15 ms.
- The process stays resident across hides — `window-all-closed` is intentionally a no-op.

### Wayland / transparency handling

`app.commandLine.appendSwitch('ozone-platform-hint', 'x11')` runs before `app.whenReady()` on Linux. Forces the X11 backend even on Wayland sessions — transparency works, and Electron's in-app `globalShortcut` fallback registers (the GNOME `gsettings` shortcut is still the preferred path because it works on either backend).

## Customizing

- **Action buttons** (icons / labels): `ACTIONS` in `src/renderer/main.ts`
- **Dialog content**: `DIALOG_CONTENT` in `src/renderer/main.ts`. Each item takes either `appId` (launches a Linux binary) or `url` (opens in default browser).
- **Native app mappings**: `APP_COMMANDS` in `src/spotlight.ts` — each `appId` maps to an ordered list of candidate commands; the first one that exists on `PATH` wins.
- **Window dimensions**: `WIN_WIDTH` / `WIN_HEIGHT`, `DIALOG_WIDTH` / `DIALOG_HEIGHT` in `src/spotlight.ts`
- **Theme**: Tailwind utilities in `src/renderer/main.ts` — pill uses `bg-white`, buttons use `bg-sky-200` / `bg-sky-300` (hover), dialog uses `bg-white`, list uses `border-slate-200/80 shadow-sm`
- **Peek mask curve**: `.peek-fade` in `src/renderer/styles.css`
- **Global shortcut**: rebind via GNOME settings or `gsettings set ...:spotlight/ binding '<Super>F1'`
- **Reveal stagger / collapse delay**: `STAGGER_MS` and `COLLAPSE_DELAY_MS` in `src/renderer/main.ts`

## Troubleshooting

### After `npm run dist` I still see the old UI

The previous Spotlight is still resident. The trigger script sees its PID file and just sends `SIGUSR1` to the **old** process, so the new AppImage never runs. Kill the resident instance once:

```bash
kill "$(cat "${XDG_RUNTIME_DIR:-/tmp}/spotlight.pid")"
```

If the PID file is missing or stale:

```bash
pkill -f release/Spotlight-
```

### `Cannot read properties of null (reading 'channel')` from electron-builder

Known electron-builder 26.x issue when no publish target is configured. Handled in `package.json` via `"publish": null` under the `build` block.

### `Ctrl+Alt+Space` doesn't open the bar

- Verify the GNOME binding:
  ```bash
  gsettings get org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/spotlight/ binding
  ```
- Make sure the trigger script is executable: `chmod +x bin/spotlight-trigger`
- Run the trigger manually to see errors: `./bin/spotlight-trigger`
- Check IBus / Fcitx isn't grabbing the same combination — pick a different `binding` if so.

### AppImage won't start (FUSE error)

```bash
sudo dnf install fuse fuse-libs        # Fedora
# or extract and run directly:
./Spotlight-0.0.1-x86_64.AppImage --appimage-extract
./squashfs-root/AppRun
```

### Transparent background looks black

Your compositor likely isn't running, or Electron picked Wayland without XWayland. The `ozone-platform-hint: x11` switch should force XWayland; if you removed it, add it back.

## Tech stack

- [Electron](https://www.electronjs.org/) — desktop runtime
- [Vite](https://vitejs.dev/) — bundler & dev server
- [vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron) — main + preload bundling
- [Tailwind CSS v4](https://tailwindcss.com/) — styling, via `@tailwindcss/vite`
- [electron-builder](https://www.electron.build/) — AppImage packaging
- [TypeScript](https://www.typescriptlang.org/) — strict mode

---

## One-shot reproduction prompt

This project was built interactively over many iterations. If you want to recreate it in a single pass with an AI assistant, the prompt below is self-contained — paste it into a fresh session of a capable model (Claude Opus 4, GPT-5 class) in an empty Linux/Fedora project directory and you should land on the same functionality.

> Build an Electron application called **Spotlight** for Linux/Fedora that behaves like macOS Spotlight but with a unique progressive-disclosure twist. Use **Electron 33+**, **Vite 6**, **vite-plugin-electron**, **Tailwind CSS v4** (via `@tailwindcss/vite`), **TypeScript** with strict mode, and **electron-builder** for packaging. Target only Linux x64 for now.
>
> **Project layout**
>
> - `src/spotlight.ts` — Electron main process
> - `src/preload.ts` — preload script exposing `window.spotlight` via `contextBridge`
> - `src/renderer/main.ts` — the renderer; reads `?view=` from the URL and routes to either the bar UI (default) or the dialog UI
> - `src/renderer/styles.css` — Tailwind import + custom drag / peek-fade rules
> - `index.html` at the project root — Vite entry
> - `icons/spotlight512x512.png` — app icon (the user will supply this)
> - `bin/spotlight-trigger` — POSIX shell script that either signals the running instance or launches the AppImage
>
> **Main process behavior**
>
> 1. On Linux force the X11 backend with `app.commandLine.appendSwitch('ozone-platform-hint', 'x11')` so transparency and XWayland hotkeys work on Wayland sessions.
> 2. Call `app.requestSingleInstanceLock()`. If the lock fails, `app.exit(0)` immediately. Handle `second-instance` by toggling visibility of the existing window.
> 3. On `whenReady`, write the process PID to `${XDG_RUNTIME_DIR ?? os.tmpdir()}/spotlight.pid`. On `will-quit`, remove that PID file (but only if it still contains this process's PID).
> 4. `process.on('SIGUSR1', toggleWindow)` — external processes can toggle the window without cold-starting Electron.
> 5. Create a `BrowserWindow` with `width: 1000`, `height: 110`, centered horizontally on the primary display with `y: 180`, `frame: false`, `transparent: true`, `backgroundColor: '#00000000'`, `resizable: false`, `movable: true`, `alwaysOnTop: true`, `skipTaskbar: true`, `hasShadow: true`, `icon: icons/spotlight512x512.png`. Use a preload script with `contextIsolation: true`, `nodeIntegration: false`. After construction, also call `setMenuBarVisibility(false)`, `setAlwaysOnTop(true, 'screen-saver')`, and `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`.
> 6. Register an in-app `globalShortcut` fallback that tries `Control+Space`, `Alt+Space`, `Super+Space`, `CommandOrControl+Shift+Space`, `Control+Alt+Space` in order, logging which one registered (or that none did).
> 7. `window-all-closed` must be a no-op so the process stays resident.
> 8. `hideWindow()` hides the bar and closes any open dialog. **Do not quit on hide** — the whole point is to stay resident.
> 9. Provide an `APP_COMMANDS` map `appId → string[][]` of candidate commands, for example `files: [['nautilus'], ['nemo'], ['dolphin'], ['thunar'], ['xdg-open', $HOME]]`. `launchApp(appId)` spawns the first candidate via `child_process.spawn(cmd, args, { detached: true, stdio: 'ignore' })` and calls `child.unref()`; on `error` tries the next candidate. Supported appIds: `files, chrome, terminal, rhythmbox, settings` — see the README for full mappings.
>
> **IPC channels** (renderer → main):
> - `spotlight:hide` — `hideWindow()` (hide + close dialog)
> - `spotlight:quit` — `app.quit()`
> - `spotlight:openDialog` (actionId) — create / replace a dialog window
> - `spotlight:closeDialog` — close the dialog
> - `spotlight:launch` (appId) — `launchApp(appId)` then `hideWindow()`
> - `spotlight:openUrl` (url) — if the URL passes `/^https?:\/\//`, call `shell.openExternal(url)`, then `hideWindow()`
>
> **Bar UI** (markup built imperatively in the renderer; Tailwind classes):
>
> - Outer: `<div class="drag flex h-screen items-center gap-4 px-5">`
> - Pill: a `.drag` div `w-[660px] shrink-0 items-center gap-4 rounded-full border border-white bg-white px-7 py-4 shadow-md` — contains the search icon (stroke-width 2.25), the `<input id="search" placeholder="Spotlight Search" class="no-drag min-w-0 flex-1 bg-transparent text-2xl font-light text-blue-950 placeholder-slate-600 outline-none">`, and a subtle `<span id="hint" class="pointer-events-none flex shrink-0 items-center gap-2 text-xs text-slate-400 transition-opacity duration-200">` with a small `<kbd>Tab</kbd>` and the text "for more".
> - Actions: a flex row of four circular `<button>`s, each 56 × 56 px (`h-14 w-14`), `bg-sky-200` / `hover:bg-sky-300` / `focus:bg-sky-300 focus-visible:ring-2 focus-visible:ring-blue-500/70`, `shadow-md`, `transition-all duration-200 ease-out`. Each starts `disabled pointer-events-none`. The first button starts with just the `peek-fade` class; the others start `opacity-0 -translate-x-3`.
> - Four actions, in order: **Applications**, **Files**, **Stack**, **Documents**. Use stroke-only SVG icons (heroicons style) drawn inline, blue-navy.
>
> **`peek-fade` CSS** (in `styles.css`):
>
> ```css
> .peek-fade {
>   -webkit-mask-image: linear-gradient(to right, black 0%, transparent 30%);
>           mask-image: linear-gradient(to right, black 0%, transparent 30%);
>   transition-property: opacity, transform, mask-image, -webkit-mask-image, background-color;
> }
> ```
>
> **Progressive disclosure state machine.** Track a single `visibleCount` (0–4). In `setVisibleCount(n)`, iterate buttons: `i < n` → revealed (remove all state classes, `disabled = false`); `i === n` → peek (add `peek-fade pointer-events-none`, `disabled = true`); `i > n` → hidden (add `opacity-0 -translate-x-3 pointer-events-none`, `disabled = true`). Update the input hint after every change and reset the 4 s auto-collapse timer when `n > 0`.
>
> **Keyboard cadence.** On the input:
> - **Tab**: if `count === 0` reveal one (`setVisibleCount(1)`); else focus first button.
> - **Shift+Tab**: if `count > 0` un-reveal one.
> - **Esc**: if `count > 0` cascade collapse (stagger 90 ms, hiding one button per tick); else if input has text, clear it; else `spotlight.hide()`.
> - **Enter**: log query; then `spotlight.hide()`.
>
> On a focused button at `index`:
> - **Tab**: if `count > index + 1` focus `buttons[index+1]`; else if `count < 4` reveal one (focus stays); else stay.
> - **Shift+Tab**: if `count > index + 1` un-reveal one (focus stays); else focus `buttons[index-1]` or input if `index === 0`.
> - **←** / **→**: walk between revealed buttons (no wrap, don't reveal anything).
> - **Enter** / **Space**: default button click → open dialog.
> - **Esc**: refocus input + cascade collapse.
>
> **Mouse-shake detector** (on `window.mousemove`, only when `count < 4`): store last `clientX`, timestamp, direction. When direction changes (`sign(dx)` flips) within ≤120 ms and velocity ≥ 0.4 px/ms, count a reversal. After 4 reversals inside a 700 ms window, call a cascading `revealNext()` (`setTimeout` chain with `STAGGER_MS = 90`).
>
> **Dialog UI.** Main process's `openDialog(actionId)` creates a new 480 × 520 `BrowserWindow`, `parent: mainWin`, frameless, transparent, always-on-top, positioned `(barBounds.x + (barBounds.width - 480)/2, barBounds.y + barBounds.height + 10)`. Load the same `index.html` with `?view=dialog&action=<actionId>`. Auto-close on `blur`. Renderer detects the query param and renders a themed card: `rounded-2xl border border-white bg-white shadow-2xl` with a header showing title + subtitle and a close button, and a listbox `<ul role="listbox" class="mx-3 mb-3 flex-1 space-y-1 overflow-y-auto rounded-lg border border-slate-200/80 p-2 shadow-sm">`.
>
> **Dialog content** (`DIALOG_CONTENT`), per action:
>
> - `apps` — Files `appId:files`, Google Chrome `appId:chrome`, Terminal `appId:terminal`, Gmail `url:https://mail.google.com/`, Google Calendar `url:https://calendar.google.com/`, Google Maps `url:https://maps.google.com/`, LinkedIn `url:https://www.linkedin.com/`, X `url:https://x.com/`, Rhythmbox `appId:rhythmbox`, Settings `appId:settings`.
> - `files`, `stack`, `docs` — three sample items each (placeholders, no appId / url).
>
> **Dialog listbox interaction.** Each item with `data-app-id` or `data-url` gets `role="option"` and starts with `tabindex="-1"`. The first interactive item receives `tabindex="0"` and `.focus()` on dialog open (roving tabindex). Handle arrow navigation: **↓** / **↑** wrap, **Home** / **End** jump to first/last, **Enter** / **Space** activate (either `window.spotlight.launch(appId)` or `window.spotlight.openUrl(url)`). **Esc** closes the dialog. Items get `focus:bg-sky-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400`, matching the hover state.
>
> **Trigger script** `bin/spotlight-trigger` (make it `chmod +x`):
>
> ```sh
> #!/bin/sh
> APPIMAGE="/absolute/path/to/release/Spotlight-0.0.1-x86_64.AppImage"
> PID_FILE="${XDG_RUNTIME_DIR:-/tmp}/spotlight.pid"
> if [ -f "$PID_FILE" ]; then
>     PID=$(cat "$PID_FILE" 2>/dev/null)
>     if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
>         kill -USR1 "$PID"
>         exit 0
>     fi
>     rm -f "$PID_FILE"
> fi
> exec "$APPIMAGE"
> ```
>
> **electron-builder config** in `package.json`'s top-level `"build"`:
>
> ```json
> {
>   "appId": "com.sandipchitale.spotlight",
>   "productName": "Spotlight",
>   "directories": { "output": "release", "buildResources": "build" },
>   "files": ["dist/**/*", "dist-electron/**/*", "icons/**/*", "package.json"],
>   "asar": true,
>   "publish": null,
>   "linux": {
>     "target": ["AppImage"],
>     "category": "Utility",
>     "icon": "icons/spotlight512x512.png",
>     "artifactName": "${productName}-${version}-${arch}.${ext}"
>   }
> }
> ```
>
> And scripts:
>
> ```json
> "scripts": {
>   "dev": "vite",
>   "build": "vite build",
>   "start": "electron .",
>   "dist": "vite build && electron-builder --linux --x64"
> }
> ```
>
> `"publish": null` is load-bearing — electron-builder 26.x throws `Cannot read properties of null (reading 'channel')` without it when no publish provider is configured.
>
> **GNOME integration.** After `npm run dist` produces the AppImage:
>
> 1. Create `~/.local/share/applications/spotlight.desktop` (Type=Application, Exec=absolute-AppImage-path %U, Icon=absolute-icon-path, Categories=System;Utility;, StartupWMClass=Spotlight); `chmod +x` it and run `update-desktop-database ~/.local/share/applications/`.
> 2. Register a GNOME custom keybinding that runs **the trigger script, not the AppImage**, on `<Control><Alt>space`. Append to `org.gnome.settings-daemon.plugins.media-keys custom-keybindings` rather than overwriting existing entries.
>
> **Theme constants to respect throughout** — opaque white / sky-blue palette, dark-navy text (`text-blue-950`), slate placeholder / secondary text, small shadows (`shadow-md` / `shadow-sm`), generous rounding (`rounded-full` for pill/buttons, `rounded-2xl` for dialog, `rounded-lg` for listbox).
>
> **Final deliverable expectations.** A single `npm install && npm run dist` should produce a working AppImage. After running it once and registering the GNOME shortcut + `.desktop` entry per the README, `Ctrl+Alt+Space` should pop the bar from anywhere on the desktop; Tab should progressively disclose the four buttons; clicking Applications → Google Chrome should launch Chrome and hide the bar; clicking Applications → Gmail should open it in the default browser.

## License

MIT © Sandip Chitale
