import sendToRender from "../utils/sendToRender"
import { ipcMain, dialog } from "electron"
import path from "node:path"

export default class CoreAdapter {
    constructor(electronApp, RelicCore) {
        this.app = electronApp
        this.core = RelicCore
        this.initialized = false
    }

    loggerWindow = null

    ipcEvents = {
        "pkg:list": async () => {
            return await this.core.package.list()
        },
        "pkg:get": async (event, pkg_id) => {
            return await this.core.db.getPackages(pkg_id)
        },
        "pkg:read": async (event, manifest_path, options = {}) => {
            const manifest = await this.core.package.read(manifest_path, options)

            return JSON.stringify({
                ...this.core.db.defaultPackageState({ ...manifest }),
                ...manifest,
                name: manifest.pkg_name,
            })
        },
        "pkg:install": async (event, manifest_path) => {
            return await this.core.package.install(manifest_path)
        },
        "pkg:update": async (event, pkg_id, { execOnFinish = false } = {}) => {
            await this.core.package.update(pkg_id)

            if (execOnFinish) {
                await this.core.package.execute(pkg_id)
            }

            return true
        },
        "pkg:apply": async (event, pkg_id, changes) => {
            return await this.core.package.apply(pkg_id, changes)
        },
        "pkg:uninstall": async (event, pkg_id) => {
            return await this.core.package.uninstall(pkg_id)
        },
        "pkg:reinstall": async (event, pkg_id) => {
            return await this.core.package.reinstall(pkg_id)
        },
        "pkg:cancel_install": async (event, pkg_id) => {
            return await this.core.package.cancelInstall(pkg_id)
        },
        "pkg:execute": async (event, pkg_id, { force = false } = {}) => {
            // check for updates first
            if (!force) {
                const update = await this.core.package.checkUpdate(pkg_id)

                if (update) {
                    return sendToRender("pkg:update_available", update)
                }
            }

            return await this.core.package.execute(pkg_id)
        },
        "pkg:open": async (event, pkg_id) => {
            return await this.core.openPath(pkg_id)
        },
        "pkg:last_operation_retry": async (event, pkg_id) => {
            return await this.core.package.lastOperationRetry(pkg_id)
        },
        "pkg:cancel_current_operation": async (event, pkg_id) => {
            return await this.core.package.cancelCurrentOperation(pkg_id)
        },
        "pkg:delete_auth": async (event, pkg_id) => {
            return await this.core.package.deauthorize(pkg_id)
        },
        "core:open-path": async (event, pkg_id) => {
            return await this.core.openPath(pkg_id)
        },
        "core:change-packages-path": async (event) => {
            const { canceled, filePaths } = await dialog.showOpenDialog(undefined, {
                properties: ["openDirectory"]
            })

            if (canceled) {
                return false
            }

            const targetPath = path.resolve(filePaths[0], "RelicPackages")

            await global.Settings.set("packages_path", targetPath)

            return targetPath
        },
        "core:set-default-packages-path": async (event) => {
            const { packages_path } = globalThis.relic_core.vars

            await global.Settings.set("packages_path", packages_path)

            return packages_path
        },
    }

    coreEvents = {
        "pkg:new": (pkg) => {
            sendToRender("pkg:new", pkg)
        },
        "pkg:remove": (pkg) => {
            sendToRender("pkg:remove", pkg)
        },
        "pkg:update:state": (data = {}) => {
            if (!data.id) {
                return false
            }

            if (data.use_id_only === true) {
                return sendToRender(`pkg:update:state:${data.id}`, data)
            }

            return sendToRender("pkg:update:state", data)
        },
        "pkg:new:done": (pkg) => {
            sendToRender("pkg:new:done", pkg)
        },
        "app:setup": (data) => {
            sendToRender("app:setup", data)
        },
        "auth:getter:error": (err) => {
            let str = "Failed to authorize"

            if (err.response.data.message) {
                str = err.response.data.message
            }

            if (err.response.data.error) {
                str = err.response.data.error
            }

            if (str.message) {
                str = str.message
            }

            sendToRender(`new:notification`, {
                type: "error",
                message: "Failed to authorize",
                description: str,
                duration: 10
            })
        },
        "pkg:authorized": (pkg) => {
            sendToRender(`new:notification`, {
                type: "success",
                message: "Package authorized",
                description: `${pkg.name} has been authorized! You can start the package now.`,
            })
        },
        "pkg:deauthorized": (pkg) => {
            sendToRender(`new:notification`, {
                type: "success",
                message: "Package deauthorized",
                description: `${pkg.name} has been deauthorized`,
            })
        },
        "pkg:error": (data) => {
            sendToRender(`new:notification`, {
                type: "error",
                message: `An error occurred`,
                description: `Something failed to ${data.event} package ${data.id}`,
            })

            sendToRender(`pkg:update:state`, data)
        },
        "logger:new": (data) => {
            if (this.loggerWindow) {
                this.loggerWindow.webContents.send("logger:new", data)
            }
        }
    }

    attachLogger = (window) => {
        this.loggerWindow = window

        window.webContents.send("logger:new", {
            timestamp: new Date().getTime(),
            message: "Core adapter attached...",
        })
    }

    detachLogger = () => {
        this.loggerWindow = null
    }

    initialize = async () => {
        if (this.initialized) {
            return
        }

        for (const [key, handler] of Object.entries(this.coreEvents)) {
            global._relic_eventBus.on(key, handler)
        }

        for (const [key, handler] of Object.entries(this.ipcEvents)) {
            ipcMain.handle(key, handler)
        }

        await this.core.initialize()
        await this.core.setup()

        this.initialized = true
    }

    deinitialize = () => {
        for (const [key, handler] of Object.entries(this.coreEvents)) {
            global._relic_eventBus.off(key, handler)
        }

        for (const [key, handler] of Object.entries(this.ipcEvents)) {
            ipcMain.removeHandler(key, handler)
        }
    }
}