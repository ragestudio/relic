import path from "node:path"
import { pipeline as streamPipeline } from "node:stream/promises"
import ChildProcess from "node:child_process"
import fs from "node:fs"
import os from "node:os"

import open from "open"
import got from "got"
import { extractFull } from "node-7z"
import { rimraf } from "rimraf"
import lodash from "lodash"

import pkg from "../../package.json"

global.OS_USERDATA_PATH = path.resolve(
    process.env.APPDATA ||
    (process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share"),
)

global.RUNTIME_PATH = path.join(global.OS_USERDATA_PATH, "rs-bundler")

const TMP_PATH = path.resolve(os.tmpdir(), "RS-MCPacks")
const INSTALLERS_PATH = path.join(global.RUNTIME_PATH, "installers")
const MANIFEST_PATH = path.join(global.RUNTIME_PATH, "manifests")

const RealmDBDefault = {
    created_at_version: pkg.version,
    installations: [],
}

function serializeIpc(data) {
    const copy = lodash.cloneDeep(data)

    // remove fns
    if (!Array.isArray(copy)) {
        Object.keys(copy).forEach((key) => {
            if (typeof copy[key] === "function") {
                delete copy[key]
            }
        })
    }

    return copy
}

function sendToRenderer(event, data) {
    global.win.webContents.send(event, serializeIpc(data))
}

async function fetchAndCreateModule(manifest) {
    console.log(`Fetching ${manifest}...`)

    try {
        const response = await got.get(manifest)
        const moduleCode = response.body

        const newModule = new module.constructor()
        newModule._compile(moduleCode, manifest)

        return newModule
    } catch (error) {
        console.error(error)
    }
}

async function readManifest(manifest, { just_read = false } = {}) {
    // check if manifest is a directory or a url
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi

    if (urlRegex.test(manifest)) {
        const _module = await fetchAndCreateModule(manifest)
        const remoteUrl = lodash.clone(manifest)

        manifest = _module.exports

        manifest.remote_url = remoteUrl
    } else {
        if (!fs.existsSync(manifest)) {
            throw new Error(`Manifest not found: ${manifest}`)
        }

        if (!fs.statSync(manifest).isFile()) {
            throw new Error(`Manifest is not a file: ${manifest}`)
        }

        const manifestFilePath = lodash.clone(manifest)

        manifest = require(manifest)

        if (!just_read) {
            // copy manifest
            fs.copyFileSync(manifestFilePath, path.resolve(MANIFEST_PATH, path.basename(manifest)))

            manifest.remote_url = manifestFilePath
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

    async openBundleFolder(manifest_id) {
        const db = await this.readDb()

        const index = db.installations.findIndex((i) => i.id === manifest_id)

        if (index !== -1) {
            const manifest = db.installations[index]

            open(manifest.install_path)
        }
    }

    async install(manifest) {
        let pendingTasks = []

        manifest = await readManifest(manifest).catch((error) => {
            sendToRenderer("runtime:error", "Cannot fetch this manifest")

            return false
        })

        if (!manifest) {
            return false
        }

        const packPath = path.resolve(INSTALLERS_PATH, manifest.id)

        if (typeof manifest.init === "function") {
            const init_result = await manifest.init({
                pack_dir: packPath,
                tmp_dir: TMP_PATH
            })

            manifest = {
                ...manifest,
                ...init_result,
            }

            delete manifest.init
        }

        manifest.status = "installing"

        console.log(`Starting to install ${manifest.pack_name}...`)
        console.log(`Installing at >`, packPath)

        sendToRenderer("new:installation", manifest)

        fs.mkdirSync(packPath, { recursive: true })

        await this.appendInstallation(manifest)

        try {
            if (typeof manifest.git_clones_steps !== "undefined" && Array.isArray(manifest.git_clones_steps)) {
                for await (const step of manifest.git_clones_steps) {
                    const _path = path.resolve(packPath, step.path)

                    console.log(`Cloning ${step.url}...`)

                    sendToRenderer(`installation:status`, {
                        ...manifest,
                        statusText: `Cloning ${step.url}`,
                    })

                    fs.mkdirSync(_path, { recursive: true })

                    await new Promise((resolve, reject) => {
                        const process = ChildProcess.exec(`${global.GIT_PATH ?? "git"} clone --recurse-submodules --remote-submodules ${step.url} ${_path}`, {
                            shell: true,
                        })

                        process.on("exit", resolve)
                        process.on("error", reject)
                    })
                }
            }

            if (typeof manifest.http_downloads !== "undefined" && Array.isArray(manifest.http_downloads)) {
                for await (const step of manifest.http_downloads) {
                    let _path = path.resolve(packPath, step.path ?? ".")

                    console.log(`Downloading ${step.url}...`)

                    sendToRenderer(`installation:status`, {
                        ...manifest,
                        statusText: `Downloading ${step.url}`,
                    })

                    if (step.tmp) {
                        _path = path.resolve(TMP_PATH, String(new Date().getTime()))
                    }

                    fs.mkdirSync(path.resolve(_path, ".."), { recursive: true })

                    await streamPipeline(
                        got.stream(step.url),
                        fs.createWriteStream(_path)
                    )

                    if (step.execute) {
                        pendingTasks.push(async () => {
                            await new Promise(async (resolve, reject) => {
                                const process = ChildProcess.execFile(_path, {
                                    shell: true,
                                }, (error) => {
                                    if (error) {
                                        reject(error)
                                    } else {
                                        resolve()
                                    }
                                })

                                process.on("exit", resolve)
                                process.on("error", reject)
                            })
                        })
                    }

                    if (step.extract) {
                        console.log(`Extracting ${step.extract}...`)

                        sendToRenderer(`installation:status`, {
                            ...manifest,
                            statusText: `Extracting bundle ${step.extract}`,
                        })

                        await new Promise((resolve, reject) => {
                            const extract = extractFull(_path, step.extract, {
                                $bin: global.SEVENZIP_PATH
                            })

                            extract.on("error", reject)
                            extract.on("end", resolve)
                        })
                    }
                }
            }

            if (pendingTasks.length > 0) {
                console.log(`Performing pending tasks...`)

                sendToRenderer(`installation:status`, {
                    ...manifest,
                    statusText: `Performing pending tasks...`,
                })

                for await (const task of pendingTasks) {
                    await task()
                }
            }

            if (typeof manifest.after_install === "function") {
                console.log(`Performing after_install hook...`)

                sendToRenderer(`installation:status`, {
                    ...manifest,
                    statusText: `Performing after_install hook...`,
                })

                await manifest.after_install({
                    manifest,
                    pack_dir: packPath,
                    tmp_dir: TMP_PATH
                })
            }

            manifest.status = "installed"
            manifest.install_path = packPath
            manifest.installed_at = new Date()
            manifest.last_update = null

            await this.appendInstallation(manifest)

            console.log(`Successfully installed ${manifest.pack_name}!`)

            sendToRenderer(`installation:done`, {
                ...manifest,
                statusText: "Successfully installed",
            })
        } catch (error) {
            manifest.status = "failed"

            sendToRenderer(`installation:error`, {
                ...manifest,
                statusText: error.toString(),
            })

            console.error(error)

            fs.rmdirSync(packPath, { recursive: true })
        }
    }

    async uninstall(manifest_id) {
        console.log(`Uninstalling >`, manifest_id)

        sendToRenderer("installation:status", {
            status: "uninstalling",
            id: manifest_id,
            statusText: `Uninstalling ${manifest_id}...`,
        })

        const db = await this.readDb()

        const manifest = db.installations.find((i) => i.id === manifest_id)

        if (!manifest) {
            sendToRenderer("runtime:error", "Manifest not found")
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

        sendToRenderer("installation:uninstalled", {
            id: manifest_id,
        })
    }

    async update(manifest_id) {
        try {
            let pendingTasks = []

            console.log(`Updating >`, manifest_id)

            sendToRenderer("installation:status", {
                status: "updating",
                id: manifest_id,
                statusText: `Updating ${manifest_id}...`,
            })

            const db = await this.readDb()

            let manifest = db.installations.find((i) => i.id === manifest_id)

            if (!manifest) {
                sendToRenderer("runtime:error", "Manifest not found")
                return false
            }

            const packPath = manifest.install_path

            if (manifest.remote_url) {
                manifest = await readManifest(manifest.remote_url, { just_read: true })
            }

            manifest.status = "updating"

            if (typeof manifest.init === "function") {
                const init_result = await manifest.init({
                    pack_dir: packPath,
                    tmp_dir: TMP_PATH
                })

                manifest = {
                    ...manifest,
                    ...init_result,
                }

                delete manifest.init
            }

            if (typeof manifest.update === "function") {
                sendToRenderer(`installation:status`, {
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
                    const _path = path.resolve(packPath, step.path)

                    console.log(`GIT Pulling ${step.url}`)

                    sendToRenderer(`installation:status`, {
                        ...manifest,
                        statusText: `GIT Pulling ${step.url}`,
                    })

                    await new Promise((resolve, reject) => {
                        const process = ChildProcess.exec(`${global.GIT_PATH ?? "git"} pull`, {
                            cwd: _path,
                            shell: true,
                        })

                        process.on("exit", resolve)
                        process.on("error", reject)
                    })
                }
            }

            if (typeof manifest.http_downloads !== "undefined" && Array.isArray(manifest.http_downloads)) {
                for await (const step of manifest.http_downloads) {
                    let _path = path.resolve(packPath, step.path ?? ".")

                    console.log(`Downloading ${step.url}...`)

                    sendToRenderer(`installation:status`, {
                        ...manifest,
                        statusText: `Downloading ${step.url}`,
                    })

                    if (step.tmp) {
                        _path = path.resolve(TMP_PATH, String(new Date().getTime()))
                    }

                    fs.mkdirSync(path.resolve(_path, ".."), { recursive: true })

                    await streamPipeline(
                        got.stream(step.url),
                        fs.createWriteStream(_path)
                    )

                    if (step.execute) {
                        pendingTasks.push(async () => {
                            await new Promise(async (resolve, reject) => {
                                const process = ChildProcess.execFile(_path, {
                                    shell: true,
                                }, (error) => {
                                    if (error) {
                                        reject(error)
                                    } else {
                                        resolve()
                                    }
                                })

                                process.on("exit", resolve)
                                process.on("error", reject)
                            })
                        })
                    }

                    if (step.extract) {
                        console.log(`Extracting ${step.extract}...`)

                        sendToRenderer(`installation:status`, {
                            ...manifest,
                            statusText: `Extracting bundle ${step.extract}`,
                        })

                        await new Promise((resolve, reject) => {
                            const extract = extractFull(_path, step.extract, {
                                $bin: global.SEVENZIP_PATH
                            })

                            extract.on("error", reject)
                            extract.on("end", resolve)
                        })
                    }
                }
            }

            if (pendingTasks.length > 0) {
                console.log(`Performing pending tasks...`)

                sendToRenderer(`installation:status`, {
                    ...manifest,
                    statusText: `Performing pending tasks...`,
                })

                for await (const task of pendingTasks) {
                    await task()
                }
            }

            if (typeof manifest.after_install === "function") {
                console.log(`Performing after_install hook...`)

                sendToRenderer(`installation:status`, {
                    ...manifest,
                    statusText: `Performing after_install hook...`,
                })

                await manifest.after_install({
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

            sendToRenderer(`installation:done`, {
                ...manifest,
                statusText: "Successfully updated",
            })
        } catch (error) {
            manifest.status = "failed"

            sendToRenderer(`installation:error`, {
                ...manifest,
                statusText: error.toString(),
            })

            console.error(error)
        }
    }

    async execute(manifest_id) {
        console.log(`Executing ${manifest_id}...`)

        sendToRenderer("installation:status", {
            status: "starting",
            id: manifest_id,
            statusText: `Executing ${manifest_id}...`,
        })

        const db = await this.readDb()

        let manifest = db.installations.find((i) => i.id === manifest_id)

        if (!manifest) {
            sendToRenderer("runtime:error", "Manifest not found")
            return false
        }

        const packPath = path.resolve(INSTALLERS_PATH, manifest.id)
        
        if (manifest.remote_url) {
            manifest = await readManifest(manifest.remote_url, { just_read: true })
        }

        if (typeof manifest.init === "function") {
            const init_result = await manifest.init({
                pack_dir: packPath,
                tmp_dir: TMP_PATH
            })

            manifest = {
                ...manifest,
                ...init_result,
            }

            delete manifest.init
        }

        if (typeof manifest.execute !== "function") {
            sendToRenderer("installation:status", {
                status: "execution_failed",
                ...manifest,
            })

            return false
        }

        await manifest.execute({
            manifest,
            pack_dir: packPath,
            tmp_dir: TMP_PATH
        })

        sendToRenderer("installation:status", {
            status: "installed",
            ...manifest,
        })

        console.log(`Successfully executed ${manifest_id}!`)

        return true
    }
}