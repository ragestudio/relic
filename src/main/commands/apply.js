import fs from "node:fs"

import sendToRender from "../utils/sendToRender"
import initManifest from "../utils/initManifest"
import parseStringVars from "../utils/parseStringVars"
import processGenericSteps from "../generic_steps"

import {
    updateInstalledPackage,
    getInstalledPackages,
} from "../local_db"

function findPatch(pkg, changes, mustBeInstalled) {
    return pkg.patches
        .filter((patch) => {
            const patchID = patch.id

            if (typeof changes.patches[patchID] === "undefined") {
                return false
            }

            if (mustBeInstalled === true && !pkg.applied_patches.includes(patch.id) && changes.patches[patchID] === true) {
                return true
            }

            if (mustBeInstalled === false && pkg.applied_patches.includes(patch.id) && changes.patches[patchID] === false) {
                return true
            }

            return false
        })
}

export default async function apply(pkg_id, changes) {
    try {
        let pkg = await getInstalledPackages(pkg_id)

        if (!pkg) {
            sendToRender("runtime:error", "Package not found")
            return false
        }

        pkg = await initManifest(pkg)

        console.log(`[${pkg_id}] apply() | Applying changes... >`, changes)

        if (typeof changes.patches !== "undefined") {
            if (!Array.isArray(pkg.applied_patches)) {
                pkg.applied_patches = []
            }

            const disablePatches = findPatch(pkg, changes, false)

            const installPatches = findPatch(pkg, changes, true)

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

                sendToRender(`pkg:update:status`, {
                    id: pkg_id,
                    status: "done",
                    statusText: `Patch [${patch.id}] removed!`,
                })
            }

            for await (let patch of installPatches) {
                if (pkg.applied_patches.includes(patch.id)) {
                    console.log(`[${pkg_id}] apply() | Patch [${patch.id}] already applied. Skipping...`)
                    continue
                }

                sendToRender(`pkg:update:status`, {
                    id: pkg_id,
                    status: "loading",
                    statusText: `Applying patch [${patch.id}]...`,
                })

                console.log(`[${pkg_id}] apply() | Applying patch [${patch.id}]...`)

                for await (let addition of patch.additions) {
                    console.log(`Processing addition [${addition.file}]`, addition)

                    // resolve patch file
                    addition.file = await parseStringVars(addition.file, pkg)

                    if (fs.existsSync(addition.file)) {
                        continue
                    }

                    await processGenericSteps(pkg, addition.steps)
                }

                // add to applied patches
                pkg.applied_patches.push(patch.id)

                sendToRender(`pkg:update:status`, {
                    id: pkg_id,
                    status: "done",
                    statusText: `Patch [${patch.id}] applied!`,
                })
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

        await updateInstalledPackage(pkg)

        sendToRender(`new:notification`, {
            type: "success",
            message: "Changes applied!",
        })

        sendToRender(`pkg:update:status`, {
            ...pkg,
        })

        console.log(`[${pkg_id}] apply() | Changes applied`)

        return true
    } catch (error) {
        console.log(error)

        sendToRender(`new:notification`, {
            type: "error",
            message: "Failed to apply changes",
        })
    }
}