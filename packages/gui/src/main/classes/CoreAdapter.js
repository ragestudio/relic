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