import Logger from "../logger"

import PatchManager from "../classes/PatchManager"
import ManifestReader from "../manifest/reader"
import ManifestVM from "../manifest/vm"
import DB from "../db"

const BaseLog = Logger.child({ service: "APPLIER" })

function findPatch(patches, applied_patches, changes, mustBeInstalled) {
    return patches.filter((patch) => {
        const patchID = patch.id

        if (typeof changes.patches[patchID] === "undefined") {
            return false
        }

        if (mustBeInstalled === true && !applied_patches.includes(patch.id) && changes.patches[patchID] === true) {
            return true
        }

        if (mustBeInstalled === false && applied_patches.includes(patch.id) && changes.patches[patchID] === false) {
            return true
        }

        return false
    }).map((patch) => patch.id)
}

export default async function apply(pkg_id, changes = {}) {
    try {
        let pkg = await DB.getPackages(pkg_id)

        if (!pkg) {
            BaseLog.error(`Package not found [${pkg_id}]`)
            return null
        }

        let manifest = await ManifestReader(pkg.local_manifest)
        manifest = await ManifestVM(manifest.code)

        const Log = Logger.child({ service: `APPLIER|${pkg.id}` })

        Log.info(`Applying changes to package...`)
        Log.info(`Changes: ${JSON.stringify(changes)}`)

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            status_text: `Applying changes to package...`,
            last_status: "loading",
        })

        if (changes.patches) {
            if (!Array.isArray(pkg.applied_patches)) {
                pkg.applied_patches = []
            }

            const patches = new PatchManager(pkg, manifest)

            await patches.remove(findPatch(manifest.patches, pkg.applied_patches, changes, false))
            await patches.patch(findPatch(manifest.patches, pkg.applied_patches, changes, true))
        }

        if (changes.config) {
            Log.info(`Applying config to package...`)

            if (Object.keys(changes.config).length !== 0) {
                Object.entries(changes.config).forEach(([key, value]) => {
                    pkg.config[key] = value
                })
            }
        }

        await DB.writePackage(pkg)

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            status_text: "All changes applied",
        })

        Log.info(`All changes applied to package.`)

        return pkg
    } catch (error) {
        global._relic_eventBus.emit(`pkg:error`, {
            event: "apply",
            id: pkg_id,
            error
        })

        BaseLog.error(`Failed to apply changes to package [${pkg_id}]`, error)
        BaseLog.error(error.stack)

        return null
    }
}