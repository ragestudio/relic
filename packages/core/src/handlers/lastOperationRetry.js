import fs from "node:fs"
import path from "node:path"

import Logger from "../logger"
import DB from "../db"

import PackageInstall from "./install"
import PackageUpdate from "./update"
import PackageUninstall from "./uninstall"

import Vars from "../vars"

export default async function lastOperationRetry(pkg_id) {
    try {
        const Log = Logger.child({ service: `OPERATION_RETRY|${pkg_id}` })
        const pkg = await DB.getPackages(pkg_id)

        if (!pkg) {
            Log.error(`This package doesn't exist`)
            return null
        }

        Log.info(`Try performing last operation retry...`)

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            status_text: `Performing last operation retry...`,
        })

        switch (pkg.last_status) {
            case "installing":
                await PackageInstall(pkg.local_manifest)
                break
            case "updating":
                await PackageUpdate(pkg_id)
                break
            case "uninstalling":
                await PackageUninstall(pkg_id)
                break
            case "failed": {
                // copy pkg.local_manifest to cache after uninstall
                const cachedManifest = path.join(Vars.cache_path, `${Date.now()}${path.basename(pkg.local_manifest)}`)

                if (!fs.existsSync(Vars.cache_path)) {
                    await fs.promises.mkdir(Vars.cache_path, { recursive: true })
                }

                await fs.promises.copyFile(pkg.local_manifest, cachedManifest)

                await PackageUninstall(pkg_id)
                await PackageInstall(cachedManifest)
                break
            }
            default: {
                Log.error(`Invalid last status: ${pkg.last_status}`)

                global._relic_eventBus.emit(`pkg:error`, {
                    id: pkg.id,
                    event: "retrying last operation",
                    status_text: `Performing last operation retry...`,
                })

                return null
            }
        }

        return pkg
    } catch (error) {
        Logger.error(`Failed to perform last operation retry of [${pkg_id}]`)
        Logger.error(error)

        global._relic_eventBus.emit(`pkg:error`, {
            event: "retrying last operation",
            id: pkg_id,
            error: error,
        })

        return null
    }
}