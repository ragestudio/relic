import fs from "node:fs"
import open from "open"

import Vars from "./vars"
import * as local_db from "./local_db"

import InstallCMD from "./commands/install"
import UpdateCMD from "./commands/update"
import ApplyCMD from "./commands/apply"
import UninstallCMD from "./commands/uninstall"
import ExecuteCMD from "./commands/execute"

export default class PkgManager {
    constructor() {
        this.initialize()
    }

    async initialize() {
        if (!fs.existsSync(Vars.runtime_path)) {
            fs.mkdirSync(Vars.runtime_path, { recursive: true })
        }

        if (!fs.existsSync(Vars.packages_path)) {
            fs.mkdirSync(Vars.packages_path, { recursive: true })
        }
    }

    /**
    * Opens the runtime path folder.
    */
    openRuntimePath() {
        open(Vars.runtime_path)
    }

    /**
     * Asynchronously retrieves the installed packages using the provided arguments.
     *
     * @param {...type} args - The arguments to be passed to the underlying local database function
     * @return {type} The result of the local database function call
     */
    async getInstalledPackages(...args) {
        return await local_db.getInstalledPackages(...args)
    }

    /**
     * Asynchronously opens a package folder.
     *
     * @param {type} pkg_id - the ID of the package to open
     * @return {type} undefined
     */
    async open(pkg_id) {
        const pkg = await local_db.getInstalledPackages(pkg_id)

        if (pkg) {
            open(pkg.install_path)
        }
    }

    /**
     * Asynchronously installs using the given arguments.
     *
     * @param {...*} args - variable number of arguments
     * @return {Promise} a promise representing the result of the installation
     */
    async install(...args) {
        return await InstallCMD(...args)
    }

    /**
     * Asynchronously updates something using the arguments provided.
     *
     * @param {...*} args - The arguments to be passed to the update function
     * @return {Promise} The result of the update operation
     */
    async update(...args) {
        return await UpdateCMD(...args)
    }

    /**
     * Asynchronously applies changes using the given arguments.
     *
     * @param {...*} args - The arguments to be passed to ApplyCMD
     * @return {Promise} The result of the ApplyCMD function
     */
    async applyChanges(...args) {
        return await ApplyCMD(...args)
    }

    /**
     * Asynchronously uninstalls using the given arguments.
     *
     * @param {...args} args - arguments to be passed to UninstallCMD
     * @return {Promise} the result of UninstallCMD
     */
    async uninstall(...args) {
        return await UninstallCMD(...args)
    }

    /**
     * Executes the command with the given arguments asynchronously.
     *
     * @param {...args} args - the arguments to be passed to the command
     * @return {Promise} a promise that resolves to the result of the command execution
     */
    async execute(...args) {
        return await ExecuteCMD(...args)
    }
}