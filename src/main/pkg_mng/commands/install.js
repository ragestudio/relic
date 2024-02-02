import fs from "node:fs"

import readManifest from "../../utils/readManifest"
import initManifest from "../../utils/initManifest"
import sendToRender from "../../utils/sendToRender"

import defaultManifest from "../../defaults/pkg_manifest"
import processGenericSteps from "../installs_steps_methods"

import applyChanges from "./apply"

import {
    updateInstalledPackage,
} from "../../local_db"

export default async function install(manifest) {
    manifest = await readManifest(manifest).catch((error) => {
        sendToRender("runtime:error", "Cannot fetch this manifest")

        return false
    })

    if (!manifest) {
        return false
    }

    let pkg = {
        ...defaultManifest,
        ...manifest,
        status: "installing",
    }

    const pkg_id = pkg.id

    sendToRender("pkg:new", pkg)

    console.log(`[${pkg_id}] install() | Starting to install...`)

    try {
        pkg = await initManifest(pkg)

        if (fs.existsSync(pkg.install_path)) {
            await fs.rmSync(pkg.install_path, { recursive: true })
        }

        await fs.mkdirSync(pkg.install_path, { recursive: true })

        // append to db
        await updateInstalledPackage(pkg)

        if (typeof pkg.before_install === "function") {
            sendToRender(`pkg:update:status`, {
                id: pkg_id,
                status: "installing",
                statusText: `Performing before_install hook...`,
            })

            console.log(`[${pkg_id}] install() | Performing before_install hook...`)

            // execute before_install
            await pkg.before_install(pkg)
        }

        sendToRender(`pkg:update:status`, {
            id: pkg_id,
            status: "installing",
            statusText: `Performing install steps...`,
        })

        // Execute generic install steps
        await processGenericSteps(pkg, pkg.install_steps)

        if (typeof pkg.after_install === "function") {
            sendToRender(`pkg:update:status`, {
                id: pkg_id,
                status: "installing",
                statusText: `Performing after_install hook...`,
            })

            console.log(`[${pkg_id}] install() | Performing after_install hook...`)

            // execute after_install
            await pkg.after_install(pkg)
        }

        pkg.status = "installed"
        pkg.installed_at = new Date()

        // update to db
        await updateInstalledPackage(pkg)

        if (pkg.patches) {
            // process default patches
            const defaultPatches = pkg.patches.filter((patch) => patch.default)

            await applyChanges(pkg.id, {
                patches: Object.fromEntries(defaultPatches.map((patch) => [patch.id, true])),
            })
        }

        if (Array.isArray(pkg.install_ask_configs)) {
            sendToRender("pkg:install:ask", pkg)
        }

        sendToRender(`pkg:update:status`, {
            id: pkg_id,
            status: "installed",
        })

        sendToRender(`new:message`, {
            message: `Successfully installed ${pkg.name}!`,
        })

        console.log(`[${pkg_id}] install() | Successfully installed ${pkg.name}!`)
    } catch (error) {
        sendToRender(`pkg:update:status`, {
            id: pkg_id,
            status: "error",
            statusText: error.toString(),
        })

        console.error(error)

        fs.rmdirSync(pkg.install_path, { recursive: true })
    }
}