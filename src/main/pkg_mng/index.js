import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import child_process from "node:child_process"
import sendToRender from "../utils/sendToRender"

global.OS_USERDATA_PATH = path.resolve(
    process.env.APPDATA ||
    (process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share"),
)
global.RUNTIME_PATH = path.join(global.OS_USERDATA_PATH, "rs-bundler")
global.TMP_PATH = path.resolve(os.tmpdir(), "rs-bundler")
global.INSTALLERS_PATH = path.join(global.RUNTIME_PATH, "installations")
global.MANIFEST_PATH = path.join(global.RUNTIME_PATH, "manifests")

import open from "open"
import { rimraf } from "rimraf"

import readManifest from "../utils/readManifest"
import initManifest from "../utils/initManifest"

import ISM_DRIVE_DL from "./installs_steps_methods/drive"
import ISM_HTTP from "./installs_steps_methods/http"
import ISM_GIT_CLONE from "./installs_steps_methods/git_clone"
import ISM_GIT_PULL from "./installs_steps_methods/git_pull"

import pkg from "../../../package.json"

const RealmDBDefault = {
    created_at_version: pkg.version,
    installations: [],
}

const InstallationStepsMethods = {
    drive_dl: ISM_DRIVE_DL,
    http: ISM_HTTP,
    git_clone: ISM_GIT_CLONE,
    git_pull: ISM_GIT_PULL,
}

async function processGenericSteps(manifest, steps) {
    console.log(`Processing steps...`, steps)

    for await (const [stepKey, stepValue] of Object.entries(steps)) {
        switch (stepKey) {
            case "drive_downloads": {
                for await (const dl_step of stepValue) {
                    await InstallationStepsMethods.drive_dl(manifest, dl_step)
                }
                break;
            }
            case "http_downloads": {
                for await (const dl_step of stepValue) {
                    await InstallationStepsMethods.http(manifest, dl_step)
                }
                break;
            }
            case "git_clones":
            case "git_clones_steps": {
                for await (const clone_step of stepValue) {
                    await InstallationStepsMethods.git_clone(manifest, clone_step)
                }
                break;
            }
            case "git_pulls":
            case "git_update":
            case "git_pulls_steps": {
                for await (const pull_step of stepValue) {
                    await InstallationStepsMethods.git_pull(manifest, pull_step)
                }
                break;
            }
            default: {
                throw new Error(`Unknown step: ${stepKey}`)
            }
        }
    }

    return manifest
}

export default class PkgManager {
    constructor() {
        this.initialize()
    }

    get realmDbPath() {
        return path.join(RUNTIME_PATH, "local_realm.json")
    }

    get runtimePath() {
        return RUNTIME_PATH
    }

    async initialize() {
        if (!fs.existsSync(RUNTIME_PATH)) {
            fs.mkdirSync(RUNTIME_PATH, { recursive: true })
        }

        if (!fs.existsSync(INSTALLERS_PATH)) {
            fs.mkdirSync(INSTALLERS_PATH, { recursive: true })
        }

        if (!fs.existsSync(MANIFEST_PATH)) {
            fs.mkdirSync(MANIFEST_PATH, { recursive: true })
        }

        if (!fs.existsSync(TMP_PATH)) {
            fs.mkdirSync(TMP_PATH, { recursive: true })
        }

        if (!fs.existsSync(this.realmDbPath)) {
            console.log(`Creating default realm db...`, this.realmDbPath)

            await this.writeDb(RealmDBDefault)
        }
    }

    // DB Operations
    async readDb() {
        return JSON.parse(await fs.promises.readFile(this.realmDbPath, "utf8"))
    }

    async writeDb(data) {
        return fs.promises.writeFile(this.realmDbPath, JSON.stringify(data, null, 2))
    }

    async appendInstallation(manifest) {
        const db = await this.readDb()

        const prevIndex = db.installations.findIndex((i) => i.id === manifest.id)

        if (prevIndex !== -1) {
            db.installations[prevIndex] = manifest
        } else {
            db.installations.push(manifest)
        }

        await this.writeDb(db)
    }

    // CRUD Operations
    async getInstallations() {
        const db = await this.readDb()

        return db.installations
    }

    async openPackageFolder(manifest_id) {
        const db = await this.readDb()

        const index = db.installations.findIndex((i) => i.id === manifest_id)

        if (index !== -1) {
            const manifest = db.installations[index]

            open(manifest.install_path)
        }
    }

    parseStringVars(str, manifest) {
        if (!manifest) {
            return str
        }

        const vars = {
            id: manifest.id,
            name: manifest.name,
            version: manifest.version,
            install_path: manifest.install_path,
            remote_url: manifest.remote_url,
        }

        const regex = /%([^%]+)%/g

        str = str.replace(regex, (match, varName) => {
            return vars[varName]
        })

        return str
    }

    async applyChanges(manifest_id, changes) {
        const db = await this.readDb()

        const index = db.installations.findIndex((i) => i.id === manifest_id)

        if (index === -1) {
            throw new Error(`Manifest not found for id: [${manifest_id}]`)
        }

        const manifest = db.installations[index]

        manifest.status = "installing"

        console.log(`Applying changes for [${manifest_id}]... >`, changes)

        sendToRender(`installation:done`, {
            ...manifest,
            statusText: "Applying changes...",
        })

        if (Array.isArray(changes.patches)) {
            if (!Array.isArray(manifest.applied_patches)) {
                manifest.applied_patches = []
            }

            const disablePatches = manifest.patches.filter((p) => {
                return !changes.patches[p.id]
            })

            const installPatches = manifest.patches.filter((p) => {
                return changes.patches[p.id]
            })

            for await (let patch of disablePatches) {
                console.log(`Removing patch [${patch.id}]...`)

                sendToRender(`installation:status`, {
                    ...manifest,
                    statusText: `Removing patch [${patch.id}]...`,
                })

                // remove patch additions
                for await (let addition of patch.additions) {
                    // resolve patch file
                    addition.file = await this.parseStringVars(addition.file, manifest)

                    console.log(`Removing addition [${addition.file}]...`)

                    if (!fs.existsSync(addition.file)) {
                        continue
                    }

                    // remove addition
                    await fs.promises.unlink(addition.file, { force: true, recursive: true })
                }

                // TODO: remove file patch overrides with original file

                // remove from applied patches
                manifest.applied_patches = manifest.applied_patches.filter((p) => {
                    return p !== patch.id
                })
            }

            for await (let patch of installPatches) {
                if (manifest.applied_patches.includes(patch.id)) {
                    continue
                }

                console.log(`Applying patch [${patch.id}]...`)

                sendToRender(`installation:status`, {
                    ...manifest,
                    statusText: `Applying patch [${patch.id}]...`,
                })

                for await (let addition of patch.additions) {
                    console.log(addition)

                    // resolve patch file
                    addition.file = await this.parseStringVars(addition.file, manifest)

                    if (fs.existsSync(addition.file)) {
                        continue
                    }

                    await processGenericSteps(manifest, addition.steps)
                }

                // add to applied patches
                manifest.applied_patches.push(patch.id)
            }
        }

        manifest.status = "installed"

        sendToRender(`installation:done`, {
            ...manifest,
            statusText: "Changes applied!",
        })

        db.installations[index] = manifest

        console.log(`Changes applied for [${manifest_id}]...`)

        await this.writeDb(db)
    }

    async install(manifest) {
        try {
            let pendingTasks = []

            manifest = await readManifest(manifest).catch((error) => {
                sendToRender("runtime:error", "Cannot fetch this manifest")

                return false
            })

            if (!manifest) {
                return false
            }

            manifest = await initManifest(manifest)

            manifest.status = "installing"

            console.log(`Starting to install ${manifest.name}...`)
            console.log(`Installing at >`, manifest.packPath)

            sendToRender("new:installation", manifest)

            fs.mkdirSync(manifest.packPath, { recursive: true })

            await this.appendInstallation(manifest)

            if (typeof manifest.before_install === "function") {
                console.log(`Performing before_install hook...`)

                sendToRender(`installation:status`, {
                    ...manifest,
                    statusText: `Performing before_install hook...`,
                })

                await manifest.before_install({
                    manifest: manifest,
                    pack_dir: manifest.packPath,
                    tmp_dir: TMP_PATH,
                })
            }

            // PROCESS STEPS
            await processGenericSteps(manifest, manifest.install_steps)

            if (pendingTasks.length > 0) {
                console.log(`Performing pending tasks...`)

                sendToRender(`installation:status`, {
                    ...manifest,
                    statusText: `Performing pending tasks...`,
                })

                for await (const task of pendingTasks) {
                    await task()
                }
            }

            if (typeof manifest.after_install === "function") {
                console.log(`Performing after_install hook...`)

                sendToRender(`installation:status`, {
                    ...manifest,
                    statusText: `Performing after_install hook...`,
                })

                await manifest.after_install({
                    manifest,
                    pack_dir: manifest.packPath,
                    tmp_dir: TMP_PATH
                })
            }

            manifest.status = "installed"
            manifest.install_path = manifest.packPath
            manifest.installed_at = new Date()
            manifest.last_update = null

            await this.appendInstallation(manifest)

            if (manifest.patches) {
                // process default patches
                const defaultPatches = manifest.patches.filter((patch) => patch.default)

                this.applyChanges(manifest.id, {
                    patches: Object.fromEntries(defaultPatches.map((patch) => [patch.id, true])),
                })
            }

            console.log(`Successfully installed ${manifest.name}!`)

            sendToRender(`installation:done`, {
                ...manifest,
                statusText: "Successfully installed",
            })
        } catch (error) {
            manifest.status = "failed"

            sendToRender(`installation:error`, {
                ...manifest,
                statusText: error.toString(),
            })

            console.error(error)

            fs.rmdirSync(manifest.packPath, { recursive: true })
        }
    }

    async uninstall(manifest_id) {
        console.log(`Uninstalling >`, manifest_id)

        sendToRender("installation:status", {
            status: "uninstalling",
            id: manifest_id,
            statusText: `Uninstalling ${manifest_id}...`,
        })

        const db = await this.readDb()

        const manifest = db.installations.find((i) => i.id === manifest_id)

        if (!manifest) {
            sendToRender("runtime:error", "Manifest not found")
            return false
        }

        if (manifest.remote_url) {
            const remoteManifest = await readManifest(manifest.remote_url, { just_read: true })

            if (typeof remoteManifest.uninstall === "function") {
                console.log(`Performing uninstall hook...`)

                await remoteManifest.uninstall({
                    manifest: remoteManifest,
                    pack_dir: remoteManifest.install_path,
                    tmp_dir: TMP_PATH,
                })
            }
        }

        await rimraf(manifest.install_path)

        db.installations = db.installations.filter((i) => i.id !== manifest_id)

        await this.writeDb(db)

        sendToRender("installation:uninstalled", {
            id: manifest_id,
        })
    }

    async update(manifest_id) {
        try {
            let pendingTasks = []

            console.log(`Updating >`, manifest_id)

            sendToRender("installation:status", {
                status: "updating",
                id: manifest_id,
                statusText: `Updating ${manifest_id}...`,
            })

            const db = await this.readDb()

            let manifest = db.installations.find((i) => i.id === manifest_id)

            if (!manifest) {
                sendToRender("runtime:error", "Manifest not found")
                return false
            }

            const packPath = manifest.install_path

            if (manifest.remote_url) {
                manifest = await readManifest(manifest.remote_url, { just_read: true })
            }

            manifest.status = "updating"

            manifest = await initManifest(manifest)

            if (typeof manifest.update === "function") {
                sendToRender(`installation:status`, {
                    ...manifest,
                    statusText: `Performing update hook...`,
                })

                console.log(`Performing update hook...`)

                await manifest.update({
                    manifest,
                    pack_dir: packPath,
                    tmp_dir: TMP_PATH
                })
            }

            // PROCESS STEPS
            await processGenericSteps(manifest, manifest.update_steps)

            if (pendingTasks.length > 0) {
                console.log(`Performing pending tasks...`)

                sendToRender(`installation:status`, {
                    ...manifest,
                    statusText: `Performing pending tasks...`,
                })

                for await (const task of pendingTasks) {
                    await task()
                }
            }

            if (typeof manifest.after_update === "function") {
                console.log(`Performing after_update hook...`)

                sendToRender(`installation:status`, {
                    ...manifest,
                    statusText: `Performing after_update hook...`,
                })

                await manifest.after_update({
                    manifest,
                    pack_dir: packPath,
                    tmp_dir: TMP_PATH
                })
            }

            manifest.status = "installed"
            manifest.install_path = packPath
            manifest.last_update = new Date()

            await this.appendInstallation(manifest)

            console.log(`Successfully updated ${manifest.name}!`)

            sendToRender(`installation:done`, {
                ...manifest,
                statusText: "Successfully updated",
            })
        } catch (error) {
            manifest.status = "failed"

            sendToRender(`installation:error`, {
                ...manifest,
                statusText: error.toString(),
            })

            console.error(error)
        }
    }

    async execute(manifest_id) {
        console.log(`Executing ${manifest_id}...`)

        sendToRender("installation:status", {
            status: "starting",
            id: manifest_id,
            statusText: `Executing ${manifest_id}...`,
        })

        const db = await this.readDb()

        let manifest = db.installations.find((i) => i.id === manifest_id)

        if (!manifest) {
            sendToRender("runtime:error", "Manifest not found")
            return false
        }

        if (manifest.remote_url) {
            manifest = {
                ...manifest,
                ...await readManifest(manifest.remote_url, { just_read: true }),
            }
        }

        manifest = await initManifest(manifest)

        if (typeof manifest.execute === "string") {
            manifest.execute = this.parseStringVars(manifest.execute, manifest)

            console.log(`Executing >`, manifest.execute)

            await new Promise((resolve, reject) => {
                const process = child_process.execFile(manifest.execute, [], {
                    shell: true,
                    cwd: manifest.install_path,
                })

                process.on("exit", resolve)
                process.on("error", reject)
            })
        } else {
            if (typeof manifest.execute !== "function") {
                sendToRender("installation:status", {
                    status: "execution_failed",
                    ...manifest,
                })

                return false
            }

            await manifest.execute({
                manifest,
                pack_dir: manifest.install_path,
                tmp_dir: TMP_PATH
            })
        }

        sendToRender("installation:status", {
            status: "installed",
            ...manifest,
        })

        console.log(`Successfully executed ${manifest_id}!`)

        return true
    }
}