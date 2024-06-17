import fs from "node:fs"
import { EventEmitter } from "@foxify/events"
import { onExit } from "signal-exit"
import open from "open"

import SetupHelper from "./helpers/setup"
import Logger from "./logger"

import Vars from "./vars"
import DB from "./db"

import PackageInstall from "./handlers/install"
import PackageExecute from "./handlers/execute"
import PackageUninstall from "./handlers/uninstall"
import PackageReinstall from "./handlers/reinstall"
import PackageCancelInstall from "./handlers/cancelInstall"
import PackageUpdate from "./handlers/update"
import PackageApply from "./handlers/apply"
import PackageList from "./handlers/list"
import PackageRead from "./handlers/read"
import PackageAuthorize from "./handlers/authorize"
import PackageDeauthorize from "./handlers/deauthorize"
import PackageCheckUpdate from "./handlers/checkUpdate"
import PackageLastOperationRetry from "./handlers/lastOperationRetry"

export default class RelicCore {
    constructor(params) {
        this.params = params
    }

    eventBus = global._relic_eventBus = new EventEmitter()

    logger = Logger

    db = DB

    async initialize() {
        globalThis.relic_core = {
            tasks: [],
        }

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
        install: PackageInstall,
        execute: PackageExecute,
        uninstall: PackageUninstall,
        reinstall: PackageReinstall,
        cancelInstall: PackageCancelInstall,
        update: PackageUpdate,
        apply: PackageApply,
        list: PackageList,
        read: PackageRead,
        authorize: PackageAuthorize,
        deauthorize: PackageDeauthorize,
        checkUpdate: PackageCheckUpdate,
        lastOperationRetry: PackageLastOperationRetry,
    }

    openPath(pkg_id) {
        if (!pkg_id) {
            return open(Vars.runtime_path)
        }

        return open(Vars.packages_path + "/" + pkg_id)
    }
}