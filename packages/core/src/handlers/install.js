import Logger from "../logger"

import fs from "node:fs"

import DB from "../db"
import ManifestReader from "../manifest/reader"
import ManifestVM from "../manifest/vm"
import GenericSteps from "../generic_steps"
import Apply from "../handlers/apply"

const BaseLog = Logger.child({ service: "INSTALLER" })

export default async function install(manifest) {
    let id = null

    try {
        BaseLog.info(`Invoking new installation...`)
        BaseLog.info(`Fetching manifest [${manifest}]`)

        const ManifestRead = await ManifestReader(manifest)

        manifest = await ManifestVM(ManifestRead.code)

        id = manifest.constructor.id

        const Log = BaseLog.child({ service: `INSTALLER|${id}` })

        Log.info(`Creating install path [${manifest.install_path}]`)

        if (fs.existsSync(manifest.install_path)) {
            Log.info(`Package already exists, removing...`)
            await fs.rmSync(manifest.install_path, { recursive: true })
        }

        await fs.mkdirSync(manifest.install_path, { recursive: true })

        Log.info(`Initializing manifest...`)

        if (typeof manifest.initialize === "function") {
            await manifest.initialize()
        }

        Log.info(`Appending to db...`)

        let pkg = DB.defaultPackageState({
            ...manifest.constructor,
            id: id,
            name: manifest.constructor.pkg_name,
            version: manifest.constructor.version,
            install_path: manifest.install_path,
            description: manifest.constructor.description,
            license: manifest.constructor.license,
            last_status: "installing",
            remote_manifest: ManifestRead.remote_manifest,
            local_manifest: ManifestRead.local_manifest,
            executable: !!manifest.execute
        })

        await DB.writePackage(pkg)

        global._relic_eventBus.emit("pkg:new", pkg)

        if (manifest.configuration) {
            Log.info(`Applying default config to package...`)

            pkg.config = Object.entries(manifest.configuration).reduce((acc, [key, value]) => {
                acc[key] = value.default

                return acc
            }, {})
        }

        if (typeof manifest.beforeInstall === "function") {
            Log.info(`Executing beforeInstall hook...`)

            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                status_text: `Performing beforeInstall hook...`,
            })

            await manifest.beforeInstall(pkg)
        }

        if (Array.isArray(manifest.installSteps)) {
            Log.info(`Executing generic install steps...`)

            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                status_text: `Performing generic install steps...`,
            })

            await GenericSteps(pkg, manifest.installSteps, Log)
        }

        if (typeof manifest.afterInstall === "function") {
            Log.info(`Executing afterInstall hook...`)

            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                status_text: `Performing afterInstall hook...`,
            })

            await manifest.afterInstall(pkg)
        }

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            status_text: `Finishing up...`,
        })

        Log.info(`Copying manifest to the final location...`)

        const finalPath = `${manifest.install_path}/.rmanifest`

        if (fs.existsSync(finalPath)) {
            await fs.promises.unlink(finalPath)
        }

        await fs.promises.copyFile(ManifestRead.local_manifest, finalPath)

        if (ManifestRead.is_catched) {
            Log.info(`Removing cache manifest...`)
            await fs.promises.unlink(ManifestRead.local_manifest)
        }

        pkg.local_manifest = finalPath
        pkg.last_status = "loading"
        pkg.installed_at = Date.now()

        await DB.writePackage(pkg)

        if (manifest.patches) {
            const defaultPatches = manifest.patches.filter((patch) => patch.default)

            if (defaultPatches.length > 0) {
                Log.info(`Applying default patches...`)

                global._relic_eventBus.emit(`pkg:update:state`, {
                    id: pkg.id,
                    status_text: `Applying default patches...`,
                })

                pkg = await Apply(id, {
                    patches: Object.fromEntries(defaultPatches.map((patch) => [patch.id, true])),
                })
            }
        }

        pkg.last_status = "installed"

        await DB.writePackage(pkg)

        global._relic_eventBus.emit(`pkg:update:state`, {
            ...pkg,
            id: pkg.id,
            last_status: "installed",
            status_text: `Installation completed successfully`,
        })

        global._relic_eventBus.emit(`pkg:new:done`, pkg)

        Log.info(`Package installed successfully!`)

        return pkg
    } catch (error) {
        global._relic_eventBus.emit(`pkg:error`, {
            id: id ?? manifest.constructor.id,
            event: "install",
            error,
        })

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: id ?? manifest.constructor.id,
            last_status: "failed",
            status_text: `Installation failed`,
        })

        BaseLog.error(`Error during installation of package [${id}] >`, error)
        BaseLog.error(error.stack)

        return null
    }
}