import os from "node:os"

global.OS_USERDATA_PATH = path.resolve(
    process.env.APPDATA ||
    (process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share"),
)
global.RUNTIME_PATH = path.join(global.OS_USERDATA_PATH, "rs-bundler")
global.TMP_PATH = path.resolve(os.tmpdir(), "rs-bundler")
global.INSTALLERS_PATH = path.join(global.RUNTIME_PATH, "installations")
global.MANIFEST_PATH = path.join(global.RUNTIME_PATH, "manifests")

import path from "node:path"
import fs from "node:fs"

import open from "open"
import { rimraf } from "rimraf"

import readManifest from "../utils/readManifest"
import initManifest from "../utils/initManifest"

import ISM_HTTP from "./installs_steps_methods/http"
import ISM_GIT from "./installs_steps_methods/git"

import pkg from "../../../package.json"

const RealmDBDefault = {
    created_at_version: pkg.version,
    installations: [],
}

const InstallationStepsMethods = {
    http: ISM_HTTP,
    git: ISM_GIT,
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

    async openBundleFolder(manifest_id) {
        const db = await this.readDb()

        const index = db.installations.findIndex((i) => i.id === manifest_id)

        if (index !== -1) {
            const manifest = db.installations[index]

            open(manifest.install_path)
        }
    }

    async install(manifest) {
        try {
            let pendingTasks = []

            manifest = await readManifest(manifest).catch((error) => {
                global.sendToRenderer("runtime:error", "Cannot fetch this manifest")

                return false
            })

            if (!manifest) {
                return false
            }

            manifest = await initManifest(manifest)

            manifest.status = "installing"

            console.log(`Starting to install ${manifest.pack_name}...`)
            console.log(`Installing at >`, manifest.packPath)

            global.sendToRenderer("new:installation", manifest)

            fs.mkdirSync(manifest.packPath, { recursive: true })

            await this.appendInstallation(manifest)

            if (typeof manifest.on_install === "function") {
                await manifest.on_install({
                    manifest: manifest,
                    pack_dir: manifest.packPath,
                    tmp_dir: TMP_PATH,
                })
            }

            if (typeof manifest.git_clones_steps !== "undefined" && Array.isArray(manifest.git_clones_steps)) {
                for await (const step of manifest.git_clones_steps) {
                    await InstallationStepsMethods.git(manifest, step)
                }
            }

            if (typeof manifest.http_downloads !== "undefined" && Array.isArray(manifest.http_downloads)) {
                for await (const step of manifest.http_downloads) {
                    await InstallationStepsMethods.http(manifest, step)
                }
            }

            if (pendingTasks.length > 0) {
                console.log(`Performing pending tasks...`)

                global.sendToRenderer(`installation:status`, {
                    ...manifest,
                    statusText: `Performing pending tasks...`,
                })

                for await (const task of pendingTasks) {
                    await task()
                }
            }

            if (typeof manifest.after_install === "function") {
                console.log(`Performing after_install hook...`)

                global.sendToRenderer(`installation:status`, {
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

            console.log(`Successfully installed ${manifest.pack_name}!`)

            global.sendToRenderer(`installation:done`, {
                ...manifest,
                statusText: "Successfully installed",
            })
        } catch (error) {
            manifest.status = "failed"

            global.sendToRenderer(`installation:error`, {
                ...manifest,
                statusText: error.toString(),
            })

            console.error(error)

            fs.rmdirSync(manifest.packPath, { recursive: true })
        }
    }

    async uninstall(manifest_id) {
        console.log(`Uninstalling >`, manifest_id)

        global.sendToRenderer("installation:status", {
            status: "uninstalling",
            id: manifest_id,
            statusText: `Uninstalling ${manifest_id}...`,
        })

        const db = await this.readDb()

        const manifest = db.installations.find((i) => i.id === manifest_id)

        if (!manifest) {
            global.sendToRenderer("runtime:error", "Manifest not found")
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

        global.sendToRenderer("installation:uninstalled", {
            id: manifest_id,
        })
    }

    async update(manifest_id) {
        try {
            let pendingTasks = []

            console.log(`Updating >`, manifest_id)

            global.sendToRenderer("installation:status", {
                status: "updating",
                id: manifest_id,
                statusText: `Updating ${manifest_id}...`,
            })

            const db = await this.readDb()

            let manifest = db.installations.find((i) => i.id === manifest_id)

            if (!manifest) {
                global.sendToRenderer("runtime:error", "Manifest not found")
                return false
            }

            const packPath = manifest.install_path

            if (manifest.remote_url) {
                manifest = await readManifest(manifest.remote_url, { just_read: true })
            }

            manifest.status = "updating"

            manifest = await initManifest(manifest)

            if (typeof manifest.update === "function") {
                global.sendToRenderer(`installation:status`, {
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

            if (typeof manifest.git_update !== "undefined" && Array.isArray(manifest.git_update)) {
                for await (const step of manifest.git_update) {
                    await InstallationStepsMethods.git(manifest, step)
                }
            }

            if (typeof manifest.http_downloads !== "undefined" && Array.isArray(manifest.http_downloads)) {
                for await (const step of manifest.http_downloads) {
                    await InstallationStepsMethods.http(manifest, step)
                }
            }

            if (pendingTasks.length > 0) {
                console.log(`Performing pending tasks...`)

                global.sendToRenderer(`installation:status`, {
                    ...manifest,
                    statusText: `Performing pending tasks...`,
                })

                for await (const task of pendingTasks) {
                    await task()
                }
            }

            if (typeof manifest.after_update === "function") {
                console.log(`Performing after_update hook...`)

                global.sendToRenderer(`installation:status`, {
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

            console.log(`Successfully updated ${manifest.pack_name}!`)

            global.sendToRenderer(`installation:done`, {
                ...manifest,
                statusText: "Successfully updated",
            })
        } catch (error) {
            manifest.status = "failed"

            global.sendToRenderer(`installation:error`, {
                ...manifest,
                statusText: error.toString(),
            })

            console.error(error)
        }
    }

    async execute(manifest_id) {
        console.log(`Executing ${manifest_id}...`)

        global.sendToRenderer("installation:status", {
            status: "starting",
            id: manifest_id,
            statusText: `Executing ${manifest_id}...`,
        })

        const db = await this.readDb()

        let manifest = db.installations.find((i) => i.id === manifest_id)

        if (!manifest) {
            global.sendToRenderer("runtime:error", "Manifest not found")
            return false
        }

        if (manifest.remote_url) {
            manifest = {
                ...manifest,
                ...await readManifest(manifest.remote_url, { just_read: true }),
            }
        }

        manifest = await initManifest(manifest)

        if (typeof manifest.execute !== "function") {
            global.sendToRenderer("installation:status", {
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

        global.sendToRenderer("installation:status", {
            status: "installed",
            ...manifest,
        })

        console.log(`Successfully executed ${manifest_id}!`)

        return true
    }
}