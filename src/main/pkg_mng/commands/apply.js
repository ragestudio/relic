import fs from "node:fs"

import sendToRender from "../../utils/sendToRender"
import initManifest from "../../utils/initManifest"
import parseStringVars from "../../utils/parseStringVars"
import processGenericSteps from "../installs_steps_methods"

import {
    updateInstalledPackage,
    getInstalledPackages,
} from "../../local_db"

export default async function apply(pkg_id, changes) {
    let pkg = await getInstalledPackages(pkg_id)

    if (!pkg) {
        sendToRender("runtime:error", "Package not found")
        return false
    }

    pkg = await initManifest(pkg)

    console.log(`[${pkg_id}] apply() | Applying changes... >`, changes)

    sendToRender(`pkg:update:status`, {
        id: pkg_id,
        status: "loading",
        statusText: "Applying changes...",
    })

    if (Array.isArray(changes.patches)) {
        if (!Array.isArray(pkg.applied_patches)) {
            pkg.applied_patches = []
        }

        const disablePatches = pkg.patches.filter((p) => {
            return !changes.patches[p.id]
        })

        const installPatches = pkg.patches.filter((p) => {
            return changes.patches[p.id]
        })

        for await (let patch of disablePatches) {
            sendToRender(`pkg:update:status`, {
                id: pkg_id,
                status: "loading",
                statusText: `Removing patch [${patch.id}]...`,
            })

            console.log(`[${pkg_id}] apply() | Removing patch [${patch.id}]...`)

            // remove patch additions
            for await (let addition of patch.additions) {
                // resolve patch file
                addition.file = await parseStringVars(addition.file, pkg)

                console.log(`[${pkg_id}] apply() | Removing addition [${addition.file}]...`)

                if (!fs.existsSync(addition.file)) {
                    continue
                }

                // remove addition
                await fs.promises.unlink(addition.file, { force: true, recursive: true })
            }

            // TODO: remove file patch overrides with original file
            // remove from applied patches
            pkg.applied_patches = pkg.applied_patches.filter((p) => {
                return p !== patch.id
            })
        }

        for await (let patch of installPatches) {
            if (pkg.applied_patches.includes(patch.id)) {
                continue
            }

            sendToRender(`pkg:update:status`, {
                id: pkg_id,
                status: "loading",
                statusText: `Applying patch [${patch.id}]...`,
            })

            console.log(`[${pkg_id}] apply() | Applying patch [${patch.id}]...`)

            for await (let addition of patch.additions) {
                console.log(addition)

                // resolve patch file
                addition.file = await parseStringVars(addition.file, pkg)

                if (fs.existsSync(addition.file)) {
                    continue
                }

                await processGenericSteps(pkg, addition.steps)
            }

            // add to applied patches
            pkg.applied_patches.push(patch.id)
        }
    }

    if (changes.configs) {
        if (!pkg.storaged_configs) {
            pkg.storaged_configs = {}
        }

        if (Object.keys(changes.configs).length !== 0) {
            Object.entries(changes.configs).forEach(([key, value]) => {
                pkg.storaged_configs[key] = value
            })
        }
    }

    pkg.status = "installed"

    await updateInstalledPackage(pkg)

    sendToRender(`pkg:update:status`, {
        id: pkg_id,
        status: "installed",
        statusText: "Changes applied!",
    })

    console.log(`[${pkg_id}] apply() | Changes applied`)

    return true
}