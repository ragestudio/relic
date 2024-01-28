import {
    updateInstalledPackage,
    getInstalledPackages,
} from "../../local_db"

import readManifest from "../../utils/readManifest"
import initManifest from "../../utils/initManifest"
import sendToRender from "../../utils/sendToRender"

import processGenericSteps from "../installs_steps_methods"

export default async function update(pkg_id) {
    // find package manifest
    let pkg = await getInstalledPackages(pkg_id)

    if (!pkg) {
        sendToRender("runtime:error", "Package not found")
        return false
    }

    try {
        // output to logs
        console.log(`[${pkg_id}] update() | Updating to latest version...`)

        // update render
        sendToRender("pkg:update:status", {
            id: pkg_id,
            status: "loading",
            statusText: `Updating to latest version...`,
        })

        // fulfill if remote available
        if (pkg.remote_url) {
            pkg = {
                ...pkg,
                ...await readManifest(pkg.remote_url, { just_read: true }),
            }
        }

        // initialize package manifest
        pkg = await initManifest(pkg)

        // check if package manifest has a update function
        if (typeof pkg.update === "function") {
            // update render
            sendToRender(`pkg:update:status`, {
                id: pkg_id,
                status: "loading",
                statusText: `Performing update hook...`,
            })

            // output to logs
            console.log(`[${pkg_id}] update() | Performing update hook`)

            // execute update function
            await pkg.update(pkg)
        }

        // Process generic steps
        await processGenericSteps(pkg, pkg.update_steps)

        // check if package manifest has an after_update function
        if (typeof pkg.after_update === "function") {
            // update render
            sendToRender(`pkg:update:status`, {
                id: pkg_id,
                status: "loading",
                statusText: `Performing after_update hook...`,
            })

            // output to logs
            console.log(`[${pkg_id}] update() | Performing after_update hook`)

            // execute after_update function
            await pkg.after_update(pkg)
        }

        // update package vars
        pkg.status = "installed"
        pkg.last_update = new Date()

        // update package manifest on db
        await updateInstalledPackage(pkg)

        // update render
        sendToRender(`pkg:update:status`, {
            ...pkg,
            status: "installed",
        })

        sendToRender(`new:notification`, {
            message: `(${pkg.name}) successfully updated!`,
        })

        // output to logs
        console.log(`[${pkg_id}] update() | Successfully updated!`)
    } catch (error) {
        // update render
        sendToRender(`pkg:update:status`, {
            ...pkg,
            status: "error",
            statusText: error.toString(),
        })

        // output to logs
        console.error(error)
    }
}