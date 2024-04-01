import ManifestReader from "../manifest/reader"
import ManifestVM from "../manifest/vm"
import DB from "../db"

const BaseLog = Logger.child({ service: "APPLIER" })

function findPatch(manifest, changes, mustBeInstalled) {
    return manifest.patches
        .filter((patch) => {
            const patchID = patch.id

            if (typeof changes.patches[patchID] === "undefined") {
                return false
            }

            if (mustBeInstalled === true && !manifest.applied_patches.includes(patch.id) && changes.patches[patchID] === true) {
                return true
            }

            if (mustBeInstalled === false && manifest.applied_patches.includes(patch.id) && changes.patches[patchID] === false) {
                return true
            }

            return false
        })
}

export default async function apply(pkg_id, changes = {}) {
    try {
        let pkg = await DB.getPackages(pkg_id)

        if (!pkg) {
            BaseLog.error(`Package not found [${pkg_id}]`)
            return null
        }

        let manifest = await ManifestReader(pkg.local_manifest)
        manifest = await ManifestVM(ManifestRead.code)

        const Log = Logger.child({ service: `APPLIER|${pkg.id}` })

        Log.info(`Applying changes to package...`)

        if (changes.patches) {
            if (!Array.isArray(pkg.applied_patches)) {
                pkg.applied_patches = []
            }

            const patches = new PatchManager(pkg, manifest)

            await patches.remove(findPatch(manifest, changes, false))
            await patches.patch(findPatch(manifest, changes, true))
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

        global._relic_eventBus.emit(`pkg:update:state:${pkg.id}`, {
            state: "All changes applied",
        })

        Log.info(`All changes applied to package.`)

        return pkg
    } catch (error) {
        global._relic_eventBus.emit(`pkg:${pkg_id}:error`, error)

        BaseLog.error(`Failed to apply changes to package [${pkg_id}]`, error)
        BaseLog.error(error.stack)

        return null
    }
}