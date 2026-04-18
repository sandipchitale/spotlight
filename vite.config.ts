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
  build: {
    emptyOutDir: true,
  },
  clearScreen: false,
})
