import Logger from "../logger"

import DB from "../db"
import ManifestReader from "../manifest/reader"
import ManifestVM from "../manifest/vm"

import { rimraf } from "rimraf"

const BaseLog = Logger.child({ service: "UNINSTALLER" })

export default async function uninstall(pkg_id) {
    try {
        const pkg = await DB.getPackages(pkg_id)

        if (!pkg) {
            BaseLog.info(`Package not found [${pkg_id}]`)
            return null
        }

        const Log = Logger.child({ service: `UNINSTALLER|${pkg.id}` })

        Log.info(`Uninstalling package...`)

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            status_text: `Uninstalling package...`,
        })

        try {
            const ManifestRead = await ManifestReader(pkg.local_manifest)
            const manifest = await ManifestVM(ManifestRead.code)

            if (typeof manifest.uninstall === "function") {
                Log.info(`Performing uninstall hook...`)

                global._relic_eventBus.emit(`pkg:update:state`, {
                    id: pkg.id,
                    status_text: `Performing uninstall hook...`,
                })

                await manifest.uninstall(pkg)
            }
        } catch (error) {
            Log.error(`Failed to perform uninstall hook`, error)
            global._relic_eventBus.emit(`pkg:error`, {
                event: "uninstall",
                id: pkg.id,
                error
            })
        }

        Log.info(`Deleting package directory...`)
        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            status_text: `Deleting package directory...`,
        })
        await rimraf(pkg.install_path)

        Log.info(`Removing package from database...`)
        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            status_text: `Removing package from database...`,
        })
        await DB.deletePackage(pkg.id)

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            last_status: "deleted",
            status_text: `Uninstalling package...`,
        })
        global._relic_eventBus.emit(`pkg:remove`, pkg)
        Log.info(`Package uninstalled successfully!`)

        return pkg
    } catch (error) {
        global._relic_eventBus.emit(`pkg:error`, {
            event: "uninstall",
            id: pkg_id,
            error
        })

        BaseLog.error(`Failed to uninstall package [${pkg_id}]`, error)
        BaseLog.error(error.stack)

        return null
    }
}