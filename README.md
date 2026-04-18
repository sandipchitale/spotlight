# Spotlight

A macOS Spotlight–style launcher for Linux, built with **Electron**, **Vite**, and **Tailwind CSS v4**.

A frameless, transparent, always-on-top window renders a horizontal pill-shaped search field. A "shake the mouse" gesture expands the bar to reveal four circular quick-action buttons. Each button opens a small themed popup dialog from which the user can launch native Linux apps or open web destinations in their default browser.

![Spotlight bar](screenshots/spotlight.png)

## Features

### UI

- Frameless, transparent, always-on-top window (uses XWayland on Wayland sessions for proper translucency)
- Horizontal pill search field with a translucent "liquid glass" appearance
- **Shake the mouse** over the bar to expand it to ~1000 px wide and reveal four circular action buttons (Apps, Files, Stack, Documents)
- Auto-collapses ~4 s after the last interaction
- Per-action popup dialog appears just below the bar, themed identically
- Drag the window from the pill body or any empty area; only the search field, buttons, and dialog list items are interactive
- Strong contrast: white pill at 90 % opacity, sky-blue buttons at 90 %, slate-600 placeholder

### Behavior

- **Resident process**: after first launch the app stays in memory; subsequent activations show / hide the window via a POSIX signal (≈ 5 ms vs. ≈ 1 s cold start)
- **Single-instance lock** so accidental double presses can't spawn duplicate popups
- **Quick actions** in the Applications dialog launch real Linux binaries:
  Files (Nautilus → Nemo → Dolphin → Thunar → `xdg-open ~`), Google Chrome,
  Terminal (Ptyxis → GNOME Terminal → Konsole → xfce4-terminal → xterm),
  Thunderbird, Rhythmbox, Settings (GNOME Control Center)
- **Web shortcuts** open in the default browser via `shell.openExternal`:
  Gmail, Google Calendar, Google Maps, LinkedIn, X
- After launching an app or opening a URL, the window hides; the process stays resident for the next press

## Keyboard shortcuts

While focus is on the search input:

| Shortcut         | Action                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| **Tab**          | If buttons are hidden → expand and show them; if visible → focus first button (Applications) |
| **Shift + Tab**  | If buttons are showing → collapse them                                  |
| **Esc**          | Collapse the buttons → clear the query → hide the window (in that order) |
| **Enter**        | Submit the query (logged to console)                                   |

While focus is on a circular button:

| Shortcut             | Action                                       |
| -------------------- | -------------------------------------------- |
| **Tab / Shift+Tab**  | Cycle between buttons (native focus order)   |
| **Shift + Tab** (first button) | Return focus to the search input    |
| **Enter / Space**    | Open that button's dialog                    |
| **Esc**              | Refocus the input and collapse the bar       |

Inside the popup dialog: **Esc** or click the close icon to dismiss. Click any item to launch / navigate.

System-wide (registered with GNOME, see below):

| Shortcut             | Action                                     |
| -------------------- | ------------------------------------------ |
| **Ctrl + Alt + Space** | Toggle the Spotlight window from anywhere |

## Drag region CSS

Desktop drag is controlled by two classes (`src/renderer/styles.css`):

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

The outer flex container, the pill body, and the dialog header are `.drag`. The `<input>`, the four circular buttons, the dialog close button, and clickable list items are `.no-drag` so they remain interactive while still letting you grab the window from any non-interactive area.

## Project layout

```
spotlight/
├── index.html                # Vite renderer entry (serves bar + dialog views via ?view= query)
├── package.json              # Scripts + electron-builder config
├── tsconfig.json
├── vite.config.ts            # Vite + Tailwind + vite-plugin-electron
├── icons/
│   └── spotlight512x512.png  # App icon (window + AppImage + .desktop)
├── bin/
│   └── spotlight-trigger     # Fast launcher script (sends SIGUSR1 if alive)
├── screenshots/
│   └── spotlight.png         # README screenshot
└── src/
    ├── spotlight.ts          # Electron main process
    ├── preload.ts            # contextBridge → window.spotlight
    └── renderer/
        ├── main.ts           # Bar UI + dialog UI + shake detection
        └── styles.css        # Tailwind import + drag/no-drag rules
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

Runs `vite build` then `electron-builder --linux --x64`, emitting `release/Spotlight-0.0.1-x86_64.AppImage`. First run downloads ~80–100 MB of Electron + appimagetool into `~/.cache/electron*` — subsequent builds are much faster.

## Installing as a GNOME application

Two pieces are involved: a `.desktop` entry that adds Spotlight to the Applications grid, and a custom GNOME keybinding that triggers the launcher script.

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

### Global keybinding (Ctrl + Alt + Space)

GNOME's settings-daemon owns the binding so it works on both Wayland and X11. Append a custom keybinding pointing at the trigger script:

```bash
SPOT=/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/spotlight/

# preserve any existing custom bindings; this example assumes one prior 'custom0'
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings \
    "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/', '$SPOT']"

gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$SPOT" name 'Spotlight'
gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$SPOT" command '/path/to/spotlight/bin/spotlight-trigger'
gsettings set "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:$SPOT" binding '<Control><Alt>space'
```

`Ctrl+Space`, `Super+Space`, and `Shift+Super+Space` are commonly bound by IBus / GNOME for input-source switching, which is why `Ctrl+Alt+Space` was chosen. Change the `binding` value to whatever you prefer; you can also edit it from **Settings → Keyboard → Customize Shortcuts → Custom Shortcuts**.

## Architecture

### Process model

- **Main process** (`src/spotlight.ts`) creates the frameless transparent `BrowserWindow`, registers the GNOME-independent in-app `globalShortcut` fallback (X11 only), bundles the four-button popup as a child `BrowserWindow`, owns the resize animation, launches native apps via `child_process.spawn`, and opens URLs via `shell.openExternal`.
- **Preload** (`src/preload.ts`) uses `contextBridge` to expose a small `window.spotlight` API to the renderer with `contextIsolation: true` and `nodeIntegration: false`. Exposed methods: `hide`, `quit`, `expand`, `collapse`, `openDialog`, `closeDialog`, `launch`, `openUrl`.
- **Renderer** (`src/renderer/main.ts`) reads `?view=` from the URL and renders either the bar UI (default) or the dialog UI. It owns: the input keyboard handlers, the focus-cycling between buttons, the auto-collapse timer, and the mouse-shake detector.

### Mouse-shake detector

Tracks `mousemove`, computes velocity (`dx/dt`), and counts direction reversals — sign changes of `dx` that occur within ~120 ms of each other and exceed 0.4 px/ms. Four reversals inside a 700 ms window (≈ two full back-and-forth shakes) triggers `expand()`.

### Window resize animation

`expand()` / `collapse()` send IPC to the main process. The main process runs a 220 ms cubic-ease-out tween over `setBounds`, recentering on the primary display each frame. The renderer simultaneously fades / slides in the four buttons.

### Single-instance + signal trigger (fast launch)

- The Electron process calls `app.requestSingleInstanceLock()` at startup and writes its PID to `$XDG_RUNTIME_DIR/spotlight.pid`.
- `process.on('SIGUSR1', toggleWindow)` lets an external process show/hide the window without a cold start.
- `bin/spotlight-trigger` is a ~10-line POSIX script: if the PID file points to a live process it sends `SIGUSR1`; otherwise it `exec`s the AppImage.
- The GNOME shortcut runs the trigger, not the AppImage. First press = cold start (~500–1500 ms); every subsequent press = ~5–15 ms.
- The process stays resident across hides — `window-all-closed` is intentionally a no-op.

### Wayland / global-shortcut handling

Electron's `globalShortcut` API does not work on Wayland because the protocol does not expose system-wide hotkeys. We force the X11 backend on Linux via `app.commandLine.appendSwitch('ozone-platform-hint', 'x11')` so the in-app fallback works under XWayland. In practice the GNOME `gsettings` shortcut above is the recommended path because it works on either backend.

## Customizing

- **Action buttons**: `ACTIONS` in `src/renderer/main.ts` (label, icon SVG).
- **Dialog content**: `DIALOG_CONTENT` in `src/renderer/main.ts`. Each item can specify either `appId` (launches a Linux binary) or `url` (opens in default browser).
- **Apps you can launch**: `APP_COMMANDS` in `src/spotlight.ts` is an `appId → command-array` map with fallbacks per app.
- **Window dimensions**: `COLLAPSED_WIDTH`, `EXPANDED_WIDTH`, `WIN_HEIGHT`, `DIALOG_WIDTH`, `DIALOG_HEIGHT` constants in `src/spotlight.ts`.
- **Theme**: Tailwind utility classes in `src/renderer/main.ts` — pill uses `bg-white/90 backdrop-blur-2xl border border-white/70`, buttons use `bg-sky-200/90`, dialog uses `bg-white/92`.

## Troubleshooting

### After `npm run dist` I still see the old UI

The previous Spotlight is still resident. The trigger script sees its PID file and just sends `SIGUSR1` to the **old** process, so the new AppImage on disk never runs. Kill the resident instance once and the next `Ctrl+Alt+Space` will launch the freshly built one (which then becomes the resident process):

```bash
kill "$(cat "${XDG_RUNTIME_DIR:-/tmp}/spotlight.pid")"
```

If the PID file is missing or stale, fall back to:

```bash
pkill -f release/Spotlight-
```

### `Cannot read properties of null (reading 'channel')` from electron-builder

Known electron-builder ≥ 26 issue when no publish target is configured. Already handled in `package.json` via `"publish": null` under the `build` block.

### `Ctrl + Alt + Space` doesn't open the bar

- Verify the GNOME binding: `gsettings get org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/spotlight/ binding`
- Make sure the trigger script is executable: `chmod +x bin/spotlight-trigger`
- Run the trigger manually to see errors: `./bin/spotlight-trigger`
- Check the IBus / Fcitx daemon isn't grabbing the same combination — pick a different `binding` value if so.

### AppImage won't start (FUSE error)

```bash
sudo dnf install fuse fuse-libs        # Fedora
# or extract and run directly:
./Spotlight-0.0.1-x86_64.AppImage --appimage-extract
./squashfs-root/AppRun
```

### Transparent background looks black

Your compositor likely needs to be enabled, or you're running on a session without one. On GNOME this is enabled by default. The `app.commandLine.appendSwitch('ozone-platform-hint', 'x11')` line forces XWayland on Wayland sessions — without it transparency may not work.

## Tech stack

- [Electron](https://www.electronjs.org/) — desktop runtime
- [Vite](https://vitejs.dev/) — bundler & dev server
- [vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron) — main + preload bundling
- [Tailwind CSS v4](https://tailwindcss.com/) — styling, via `@tailwindcss/vite`
- [electron-builder](https://www.electron.build/) — AppImage packaging
- [TypeScript](https://www.typescriptlang.org/) — strict mode

## License

MIT © Sandip Chitale
