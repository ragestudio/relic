import fs from "node:fs"
import { EventEmitter } from "@foxify/events"
import { onExit } from "signal-exit"
import open from "open"

import SetupHelper from "./helpers/setup"
import Logger from "./logger"

import Vars from "./vars"
import DB from "./db"

export default class RelicCore {
    constructor(params) {
        this.params = params
    }

    eventBus = global._relic_eventBus = new EventEmitter()
    logger = global.Logger = Logger

    async initialize() {
        await DB.initialize()

        onExit(this.onExit)
    }

    onExit = () => {
        if (fs.existsSync(Vars.cache_path)) {
            fs.rmSync(Vars.cache_path, { recursive: true, force: true })
        }
    }

    async setup() {
        return await SetupHelper()
    }

    package = {
        install: require("./handlers/install").default,
        execute: require("./handlers/execute").default,
        uninstall: require("./handlers/uninstall").default,
        update: require("./handlers/update").default,
        apply: require("./handlers/apply").default,
        list: require("./handlers/list").default,
    }

    openPath(pkg_id) {
        if (!pkg_id) {
            return open(Vars.runtime_path)
        }

        return open(Vars.packages_path + "/" + pkg_id)
    }
}