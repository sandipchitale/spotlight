import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    electron({
      main: {
        entry: 'src/spotlight.ts',
      },
      preload: {
        input: 'src/preload.ts',
      },
      renderer: {},
    }),
  ],
  // Bake process.platform into the renderer bundle at build time so the
  // sandboxed renderer (where process is unavailable) doesn't crash.
  define: {
    'process.platform': JSON.stringify(process.platform),
  },
  build: {
    emptyOutDir: true,
  },
  clearScreen: false,
})
