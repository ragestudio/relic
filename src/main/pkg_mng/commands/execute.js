import {
    getInstalledPackages,
} from "../../local_db"

import readManifest from "../../utils/readManifest"
import initManifest from "../../utils/initManifest"
import parseStringVars from "../../utils/parseStringVars"
import sendToRender from "../../utils/sendToRender"

export default async function execute(pkg_id) {
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
            ...await readManifest(pkg.remote_url, { just_read: true }),
        }
    }

    pkg = await initManifest(pkg)

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