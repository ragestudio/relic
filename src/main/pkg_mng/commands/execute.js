import {
    getInstalledPackages,
} from "../../local_db"

import readManifest from "../../utils/readManifest"
import initManifest from "../../utils/initManifest"
import parseStringVars from "../../utils/parseStringVars"
import sendToRender from "../../utils/sendToRender"

export default async function execute(pkg_id, { force = false } = {}) {
    let pkg = await getInstalledPackages(pkg_id)

    if (!pkg) {
        sendToRender("runtime:error", "Package not found")
        return false
    }

    sendToRender("pkg:update:status", {
        id: pkg_id,
        status: "loading",
        statusText: `Executing...`,
    })

    console.log(`[${pkg_id}] execute() | Executing...`)

    if (pkg.remote_url) {
        pkg = {
            ...pkg,
            ...await readManifest(pkg, { just_read: true }),
        }
    }

    pkg = await initManifest(pkg)

    if (pkg.check_updates_after_execute === true) {
        if (pkg._original_manifest) {
            if ((pkg._original_manifest.version !== pkg.version) && !force) {
                console.log(`[${pkg_id}] execute() | Update available (${pkg._original_manifest.version} -> ${pkg.version}). Aborting...`,)
                console.log(pkg._original_manifest)

                sendToRender("pkg:update_available", {
                    manifest: pkg._original_manifest,
                    current_version: pkg._original_manifest.version,
                    new_version: pkg.version,
                })

                sendToRender("pkg:update:status", {
                    id: pkg_id,
                    status: "installed",
                })

                return false
            }
        }
    }

    if (typeof pkg.after_execute === "function") {
        await pkg.after_execute(pkg)
    }

    if (typeof pkg.execute === "string") {
        pkg.execute = parseStringVars(pkg.execute, pkg)

        console.log(`[${pkg_id}] execute() | Executing binary from path >`, pkg.execute)

        await new Promise((resolve, reject) => {
            const process = child_process.execFile(pkg.execute, [], {
                shell: true,
                cwd: pkg.install_path,
            })

            process.on("exit", resolve)
            process.on("error", reject)
        })
    } else {
        try {
            if (typeof pkg.execute !== "function") {
                sendToRender("installation:status", {
                    id: pkg_id,
                    status: "error",
                    statusText: "No execute function found",
                })

                return false
            }

            await pkg.execute(pkg)
        } catch (error) {
            sendToRender("new:notification", {
                type: "error",
                message: "Failed to launch",
                description: error.toString(),
            })

            return sendToRender("pkg:update:status", {
                id: pkg_id,
                status: "installed",
                statusText: `Failed to launch`,
            })
        }
    }

    sendToRender("pkg:update:status", {
        id: pkg_id,
        status: "installed",
    })

    console.log(`[${pkg_id}] execute() | Successfully executed`)

    return true
}