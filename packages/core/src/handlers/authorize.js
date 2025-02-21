import ManifestAuthDB from "../classes/ManifestAuthDB"
import DB from "../db"

import Logger from "../logger"

const Log = Logger.child({ service: "AUTH" })

export default async (pkg_id, value) => {
    if (!pkg_id) {
        Log.error("pkg_id is required")
        return false
    }

    if (!value) {
        Log.error("value is required")
        return false
    }

    const pkg = await DB.getPackages(pkg_id)

    if (!pkg) {
        Log.error("Package not found")
        return false
    }

    Log.info(`Setting auth for [${pkg_id}]`)

    await ManifestAuthDB.set(pkg_id, value)

    global._relic_eventBus.emit("pkg:authorized", pkg)

    return true
}