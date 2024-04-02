import Logger from "../logger"
import DB from "../db"

import softRead from "./read"

const Log = Logger.child({ service: "CHECK_UPDATE" })

export default async function checkUpdate(pkg_id) {
    const pkg = await DB.getPackages(pkg_id)

    if (!pkg) {
        Log.error("Package not found")
        return false
    }

    Log.info(`Checking update for [${pkg_id}]`)

    const remoteSoftManifest = await softRead(pkg.remote_manifest, {
        soft: true
    })

    if (!remoteSoftManifest) {
        Log.error("Cannot read remote manifest")
        return false
    }

    if (pkg.version === remoteSoftManifest.version) {
        Log.info("No update available")
        return false
    }

    Log.info("Update available")
    Log.info("Local:", pkg.version)
    Log.info("Remote:", remoteSoftManifest.version)
    Log.info("Changelog:", remoteSoftManifest.changelog_url)

    return {
        id: pkg.id,
        local: pkg.version,
        remote: remoteSoftManifest.version,
        changelog: remoteSoftManifest.changelog_url,
    }
}