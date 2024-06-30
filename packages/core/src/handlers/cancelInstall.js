import Logger from "../logger"

import DB from "../db"

import UninstallHandler from "./uninstall"

const BaseLog = Logger.child({ service: "CANCEL_INSTALL" })

export default async function reinstall(pkg_id) {
    try {
        const pkg = await DB.getPackages(pkg_id)

        if (!pkg) {
            BaseLog.info(`Package not found [${pkg_id}]`)
            return null
        }

        const task = globalThis.relic_core.tasks.find((task) => task.id === pkg_id)

        if (task) {
            BaseLog.warn(`Task not found [${pkg_id}]`)
            await task.abortController.abort()

            global._relic_eventBus.emit(`pkg:install:cancel`, pkg_id)
            global._relic_eventBus.emit(`pkg:install:cancel:${pkg_id}`, pkg_id)
            global._relic_eventBus.emit(`task:cancel:${pkg_id}`, pkg_id)
        }

        await UninstallHandler(pkg_id)

        return pkg
    } catch (error) {
        global._relic_eventBus.emit(`pkg:error`, {
            event: "cancel_install",
            id: pkg_id,
            error
        })

        BaseLog.error(`Failed to cancel installation package [${pkg_id}]`, error)
        BaseLog.error(error.stack)

        return null
    }
}