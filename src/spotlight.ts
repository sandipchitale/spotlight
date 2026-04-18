import {app, BrowserWindow, globalShortcut, ipcMain, screen, shell} from 'electron'
import {spawn} from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'

// Tiny PID file so an external trigger script can SIGUSR1 the running instance
// instead of paying the cold-start cost of launching another Electron process.
const PID_FILE = path.join(process.env['XDG_RUNTIME_DIR'] ?? os.tmpdir(), 'spotlight.pid')

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// On Linux/Wayland, Electron's globalShortcut API does not work because Wayland has
// no protocol for system-wide hotkeys. Force the X11 backend (XWayland) on Linux so
// the global shortcut can be registered.
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('ozone-platform-hint', 'x11')
}

// Single-instance: if another spotlight process is already running, surface its
// window and exit this one immediately so we don't get two popups.
const gotInstanceLock = app.requestSingleInstanceLock()
if (!gotInstanceLock) {
    app.exit(0)
}

// Window is always full width — no per-step OS resize. The empty area is
// transparent, so the user only sees the pill + revealed buttons.
// Math: px-5 padding (40) + pill (660) + gap-4 (16) + 4 buttons (4*56) + 3 gaps (3*12) = 976.
// Add ~24 px buffer for the drop-shadow to render without being clipped at the window edge.
const WIN_WIDTH = 1000
const WIN_HEIGHT = 110

let win: BrowserWindow | null = null
let dialogWin: BrowserWindow | null = null

const DIALOG_WIDTH = 480
const DIALOG_HEIGHT = 520

// Linux command to spawn for each app id, in order of preference. The first one
// that exists on PATH wins; missing binaries fall through to the next candidate.
const APP_COMMANDS: Record<string, string[][]> = {
    files: [['nautilus'], ['nemo'], ['dolphin'], ['thunar'], ['xdg-open', process.env['HOME'] ?? '/']],
    firefox: [['firefox'], ['firefox-esr']],
    chrome: [['google-chrome'], ['google-chrome-stable'], ['chromium-browser'], ['chromium']],
    terminal: [['ptyxis'], ['gnome-terminal'], ['konsole'], ['xfce4-terminal'], ['xterm']],
    thunderbird: [['thunderbird']],
    calendar: [['gnome-calendar']],
    rhythmbox: [['rhythmbox'], ['lollypop']],
    settings: [['gnome-control-center'], ['systemsettings5'], ['xfce4-settings-manager']],
}

function launchApp(appId: string): void {
    const candidates = APP_COMMANDS[appId]
    if (!candidates) {
        console.warn(`[spotlight] unknown app id: ${appId}`)
        return
    }

    const tryNext = (i: number): void => {
        if (i >= candidates.length) {
            console.warn(`[spotlight] no launcher for ${appId} found on PATH`)
            return
        }
        const candidate = candidates[i]!
        const [exe, ...args] = candidate
        if (!exe) {
            tryNext(i + 1)
            return
        }
        try {
            const child = spawn(exe, args, {detached: true, stdio: 'ignore'})
            child.on('error', () => tryNext(i + 1))
            child.unref()
        } catch {
            tryNext(i + 1)
        }
    }

    tryNext(0)
}

function createWindow(): void {
    const {width: screenWidth} = screen.getPrimaryDisplay().workAreaSize

    win = new BrowserWindow({
        width: WIN_WIDTH,
        height: WIN_HEIGHT,
        x: Math.round((screenWidth - WIN_WIDTH) / 2),
        y: 180,
        frame: false,
        transparent: true,
        resizable: false,
        movable: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        hasShadow: true,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, '../icons/spotlight512x512.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    win.setMenuBarVisibility(false)
    win.setAlwaysOnTop(true, 'screen-saver')
    win.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true})

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
        // win.webContents.openDevTools({ mode: 'detach' })
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    win.once('ready-to-show', () => {
        win?.show()
        win?.focus()
    })

    win.on('closed', () => {
        win = null
    })
}

function openDialog(actionId: string): void {
    if (!win) return

    if (dialogWin && !dialogWin.isDestroyed()) {
        dialogWin.close()
        dialogWin = null
    }

    const barBounds = win.getBounds()
    const x = barBounds.x + Math.round((barBounds.width - DIALOG_WIDTH) / 2)
    const y = barBounds.y + barBounds.height + 10

    dialogWin = new BrowserWindow({
        parent: win,
        width: DIALOG_WIDTH,
        height: DIALOG_HEIGHT,
        x,
        y,
        frame: false,
        transparent: true,
        resizable: false,
        movable: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        hasShadow: true,
        backgroundColor: '#00000000',
        icon: path.join(__dirname, '../icons/spotlight512x512.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    dialogWin.setMenuBarVisibility(false)
    dialogWin.setAlwaysOnTop(true, 'screen-saver')

    if (VITE_DEV_SERVER_URL) {
        dialogWin.loadURL(`${VITE_DEV_SERVER_URL}?view=dialog&action=${encodeURIComponent(actionId)}`)
    } else {
        dialogWin.loadFile(path.join(__dirname, '../dist/index.html'), {
            query: {view: 'dialog', action: actionId},
        })
    }

    dialogWin.once('ready-to-show', () => {
        dialogWin?.show()
        dialogWin?.focus()
    })

    dialogWin.on('blur', () => {
        if (dialogWin && !dialogWin.isDestroyed()) dialogWin.close()
    })

    dialogWin.on('closed', () => {
        dialogWin = null
    })
}

function closeDialog(): void {
    if (dialogWin && !dialogWin.isDestroyed()) dialogWin.close()
    dialogWin = null
}

function showWindow(): void {
    if (!win) {
        createWindow()
        return
    }
    if (!win.isVisible()) win.show()
    if (win.isMinimized()) win.restore()
    win.focus()
}

function hideWindow(): void {
    closeDialog()
    if (win && !win.isDestroyed()) win.hide()
}

function toggleWindow(): void {
    if (!win) {
        createWindow()
        return
    }
    if (win.isVisible()) {
        hideWindow()
    } else {
        showWindow()
    }
}

function registerToggleShortcut(): void {
    // Try several accelerators in order. Ctrl+Space is often grabbed on Linux by
    // IBus/Fcitx (input method switcher), so we fall back to other combinations.
    const candidates = [
        'Control+Space',
        'Alt+Space',
        'Super+Space',
        'CommandOrControl+Shift+Space',
        'Control+Alt+Space',
    ]

    for (const accel of candidates) {
        try {
            const ok = globalShortcut.register(accel, toggleWindow)
            if (ok && globalShortcut.isRegistered(accel)) {
                console.log(`[spotlight] global shortcut registered: ${accel}`)
                return
            }
        } catch (err) {
            console.warn(`[spotlight] failed to register ${accel}:`, err)
        }
    }
    console.warn(
        '[spotlight] could not register any global shortcut. ' +
        'On Wayland, run with --ozone-platform=x11 (already attempted), ' +
        'or unbind Ctrl+Space from your input-method daemon (IBus/Fcitx).'
    )
}

app.on('second-instance', () => {
    // Re-summon the existing window instead of letting a duplicate spawn.
    toggleWindow()
})

// External trigger script sends SIGUSR1 to toggle visibility — much faster
// than spawning a fresh Electron process per keypress.
process.on('SIGUSR1', toggleWindow)

app.whenReady().then(() => {
    try {
        fs.writeFileSync(PID_FILE, String(process.pid), {flag: 'w'})
    } catch (err) {
        console.warn('[spotlight] could not write pid file:', err)
    }

    createWindow()

    registerToggleShortcut()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

ipcMain.on('spotlight:hide', hideWindow)
ipcMain.on('spotlight:quit', () => app.quit())
ipcMain.on('spotlight:openDialog', (_e, actionId: string) => openDialog(actionId))
ipcMain.on('spotlight:closeDialog', () => closeDialog())
ipcMain.on('spotlight:launch', (_e, appId: string) => {
    launchApp(appId)
    hideWindow()
})
ipcMain.on('spotlight:openUrl', (_e, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        shell.openExternal(url).catch((err) => {
            console.warn(`[spotlight] openExternal failed for ${url}:`, err)
        })
    }
    hideWindow()
})

// Don't quit when the bar is hidden — we want the process resident so
// SIGUSR1 / second-instance can re-summon it instantly.
app.on('window-all-closed', () => {
    // intentionally a no-op
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    try {
        if (fs.existsSync(PID_FILE) && fs.readFileSync(PID_FILE, 'utf8') === String(process.pid)) {
            fs.unlinkSync(PID_FILE)
        }
    } catch {
        // ignore
    }
})
