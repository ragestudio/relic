import Logger from "../logger"

import DB from "../db"

import UninstallHandler from "./uninstall"
import InstallHandler from "./install"

const BaseLog = Logger.child({ service: "REINSTALL" })

export default async function reinstall(pkg_id) {
    try {
        const pkg = await DB.getPackages(pkg_id)

        if (!pkg) {
            BaseLog.info(`Package not found [${pkg_id}]`)
            return null
        }

        await UninstallHandler(pkg_id)
        await InstallHandler(pkg.remote_manifest)

        return pkg
    } catch (error) {
        global._relic_eventBus.emit(`pkg:error`, {
            event: "reinstall",
            id: pkg_id,
            error
        })

        BaseLog.error(`Failed to reinstall package [${pkg_id}]`, error)
        BaseLog.error(error.stack)

        return null
    }
}