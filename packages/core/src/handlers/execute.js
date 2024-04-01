import fs from "node:fs"

import DB from "../db"
import SetupHelper from "../helpers/setup"
import ManifestReader from "../manifest/reader"
import ManifestVM from "../manifest/vm"
import parseStringVars from "../utils/parseStringVars"
import { execa } from "../libraries/execa"

const BaseLog = Logger.child({ service: "EXECUTER" })

export default async function execute(pkg_id, { useRemote = false, force = false } = {}) {
    try {
        const pkg = await DB.getPackages(pkg_id)

        if (!pkg) {
            BaseLog.info(`Package not found [${pkg_id}]`)
            return false
        }

        await SetupHelper()

        const manifestPath = useRemote ? pkg.remote_manifest : pkg.local_manifest

        if (!fs.existsSync(manifestPath)) {
            BaseLog.error(`Manifest not found in expected path [${manifestPath}] 
        \nMaybe the package installation has not been completed yet or corrupted.
        `)

            return false
        }

        const ManifestRead = await ManifestReader(manifestPath)

        const manifest = await ManifestVM(ManifestRead.code)

        if (typeof manifest.execute === "function") {
            await manifest.execute(pkg)
        }

        if (typeof manifest.execute === "string") {
            manifest.execute = parseStringVars(manifest.execute, pkg)

            BaseLog.info(`Executing binary > [${manifest.execute}]`)

            const args = Array.isArray(manifest.execute_args) ? manifest.execute_args : []

            await execa(manifest.execute, args, {
                cwd: pkg.install_path,
                stdout: "inherit",
                stderr: "inherit",
            })
        }

        return pkg
    } catch (error) {
        global._relic_eventBus.emit(`pkg:${pkg_id}:error`, error)

        BaseLog.error(`Failed to execute package [${pkg_id}]`, error)
        BaseLog.error(error.stack)

        return null
    }
}
