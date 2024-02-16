import { resolve } from "path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    // build: {
    //   rollupOptions: {
    //     output: {
    //       format: "es"
    //     }
    //   }
    // },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    // build: {
    //   rollupOptions: {
    //     output: {
    //       format: "es"
    //     }
    //   }
    // },
  },
  renderer: {
    resolve: {
      alias: {
        "config": resolve("src/renderer/config"),
        "style": resolve("src/renderer/src/style"),
        "components": resolve("src/renderer/src/components"),
        "utils": resolve("src/renderer/src/utils"),
        "contexts": resolve("src/renderer/src/contexts"),
        "pages": resolve("src/renderer/src/pages"),
        "layout": resolve("src/renderer/src/layout"),
        "hooks": resolve("src/renderer/src/hooks"),
        "services": resolve("src/renderer/src/services"),
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [react()],
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true
        }
      }
    }
  }
})
