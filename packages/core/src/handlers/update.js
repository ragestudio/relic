import Logger from "../logger"

import DB from "../db"

import ManifestReader from "../manifest/reader"
import ManifestVM from "../manifest/vm"

import GenericSteps from "../generic_steps"
import PatchManager from "../classes/PatchManager"

const BaseLog = Logger.child({ service: "UPDATER" })

const AllowedPkgChanges = [
    "id",
    "name",
    "version",
    "description",
    "author",
    "license",
    "icon",
    "core_minimum_version",
    "remote_manifest",
]

const ManifestKeysMap = {
    "name": "pkg_name",
}

export default async function update(pkg_id) {
    try {
        const pkg = await DB.getPackages(pkg_id)

        if (!pkg) {
            BaseLog.error(`Package not found [${pkg_id}]`)

            return null
        }

        const Log = BaseLog.child({ service: `UPDATER|${pkg.id}` })

        let ManifestRead = await ManifestReader(pkg.local_manifest)
        let manifest = await ManifestVM(ManifestRead.code)

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            last_status: "updating",
            status_text: `Updating package...`,
        })

        pkg.last_status = "updating"

        await DB.writePackage(pkg)

        if (typeof manifest.update === "function") {
            Log.info(`Performing update hook...`)

            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                status_text: `Performing update hook...`,
            })

            await manifest.update(pkg)
        }

        if (manifest.updateSteps) {
            Log.info(`Performing update steps...`)

            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                status_text: `Performing update steps...`,
            })

            await GenericSteps(pkg, manifest.updateSteps, Log)
        }

        if (Array.isArray(pkg.applied_patches)) {
            const patchManager = new PatchManager(pkg, manifest)

            await patchManager.reapply()
        }

        if (typeof manifest.afterUpdate === "function") {
            Log.info(`Performing after update hook...`)

            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                status_text: `Performing after update hook...`,
            })

            await manifest.afterUpdate(pkg)
        }

        ManifestRead = await ManifestReader(pkg.local_manifest)
        manifest = await ManifestVM(ManifestRead.code)

        // override public static values
        for await (const key of AllowedPkgChanges) {
            if (key in manifest.constructor) {
                const mapKey = ManifestKeysMap[key] || key
                pkg[key] = manifest.constructor[mapKey]
            }
        }

        pkg.last_status = "installed"
        pkg.last_update = Date.now()

        await DB.writePackage(pkg)

        Log.info(`Package updated successfully`)

        global._relic_eventBus.emit(`pkg:update:state`, {
            ...pkg,
            id: pkg.id,
        })

        return pkg
    } catch (error) {
        global._relic_eventBus.emit(`pkg:error`, {
            event: "update",
            id: pkg_id,
            error,
            last_status: "failed"
        })

        try {
            await DB.updatePackageById(pkg_id, {
                last_status: "failed",
            })
        } catch (error) {
            BaseLog.error(`Failed to update status of pkg [${pkg_id}]`)
            BaseLog.error(error.stack)
        }

        BaseLog.error(`Failed to update package [${pkg_id}]`, error)
        BaseLog.error(error.stack)

        return null
    }
}