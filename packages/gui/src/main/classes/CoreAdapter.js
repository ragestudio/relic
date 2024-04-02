import sendToRender from "../utils/sendToRender"

export default class CoreAdapter {
    constructor(electronApp, RelicCore) {
        this.app = electronApp
        this.core = RelicCore

        this.initialize()
    }

    events = {
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
            sendToRender(`new:notification`, {
                type: "error",
                message: "Failed to authorize",
                description: err.response.data.message ?? err.response.data.error ?? err.message,
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
        "pkg:error": (data) => {
            sendToRender(`new:notification`, {
                type: "error",
                message: `An error occurred`,
                description: `Something failed to ${data.event} package ${data.pkg_id}`,
            })

            sendToRender(`pkg:update:state`, data)
        }
    }

    initialize = () => {
        for (const [key, handler] of Object.entries(this.events)) {
            global._relic_eventBus.on(key, handler)
        }
    }

    deinitialize = () => {
        for (const [key, handler] of Object.entries(this.events)) {
            global._relic_eventBus.off(key, handler)
        }
    }
}