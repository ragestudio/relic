import {
    getInstalledPackages,
    deleteInstalledPackage,
} from "../../local_db"

import sendToRender from "../../utils/sendToRender"
import readManifest from "../../utils/readManifest"
import initManifest from "../../utils/initManifest"

import { rimraf } from "rimraf"

export default async function uninstall(pkg_id) {
    let pkg = await getInstalledPackages(pkg_id)

    if (!pkg) {
        sendToRender("runtime:error", "Package not found")
        return false
    }

    sendToRender("pkg:update:status", {
        id: pkg_id,
        status: "uninstalling",
        statusText: `Uninstalling...`,
    })

    console.log(`[${pkg_id}] uninstall() | Uninstalling...`)

    if (pkg.remote_url) {
        pkg = await readManifest(pkg.remote_url, { just_read: true })

        if (typeof pkg.uninstall === "function") {
            console.log(`Performing uninstall hook...`)

            await pkg.uninstall(pkg)
        }
    }

    pkg = await initManifest(pkg)

    await deleteInstalledPackage(pkg_id)

    await rimraf(pkg.install_path)

    sendToRender("pkg:remove", {
        id: pkg_id
    })
}