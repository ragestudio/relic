import ManifestAuthDB from "../classes/ManifestAuthDB"
import DB from "../db"

import Logger from "../logger"

const Log = Logger.child({ service: "AUTH" })

export default async (pkg_id) => {
    if (!pkg_id) {
        Log.error("pkg_id is required")
        return false
    }

    const pkg = await DB.getPackages(pkg_id)

    if (!pkg) {
        Log.error("Package not found")
        return false
    }

    Log.info(`Deleting auth for [${pkg_id}]`)

    await ManifestAuthDB.delete(pkg_id)

    global._relic_eventBus.emit("pkg:deauthorized", pkg)

    return true
}