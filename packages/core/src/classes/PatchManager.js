import Logger from "../logger"

import DB from "../db"
import fs from "node:fs"

import GenericSteps from "../generic_steps"
import parseStringVars from "../utils/parseStringVars"

export default class PatchManager {
    constructor(pkg, manifest) {
        this.pkg = pkg
        this.manifest = manifest

        this.log = Logger.child({ service: `PATCH-MANAGER|${pkg.id}` })
    }

    async get(select) {
        if (!this.manifest.patches) {
            return []
        }

        let list = []

        if (typeof select === "undefined") {
            list = this.manifest.patches
        }

        if (Array.isArray(select)) {
            for await (let id of select) {
                const patch = this.manifest.patches.find((patch) => patch.id === id)

                if (patch) {
                    list.push(patch)
                }
            }
        }

        return list
    }

    async reapply() {
        if (Array.isArray(this.pkg.applied_patches)) {
            return await this.patch(this.pkg.applied_patches)
        }

        return true
    }

    async patch(select) {
        const list = await this.get(select)

        for await (let patch of list) {
            global._relic_eventBus.emit(`pkg:update:state`, {
                id: this.pkg.id,
                status_text: `Applying patch [${patch.id}]...`,
            })

            this.log.info(`Applying patch [${patch.id}]...`)

            if (Array.isArray(patch.additions)) {
                this.log.info(`Applying ${patch.additions.length} Additions...`)

                for await (let addition of patch.additions) {
                    // resolve patch file
                    addition.file = await parseStringVars(addition.file, this.pkg)

                    if (fs.existsSync(addition.file)) {
                        this.log.info(`Addition [${addition.file}] already exists. Skipping...`)
                        continue
                    }

                    this.log.info(`Applying addition [${addition.file}]`)

                    global._relic_eventBus.emit(`pkg:update:state`, {
                        id: this.pkg.id,
                        status_text: `Applying addition [${addition.file}]`,
                    })

                    await GenericSteps(this.pkg, addition.steps, this.log)
                }
            }

            if (!this.pkg.applied_patches.includes(patch.id)) {
                this.pkg.applied_patches.push(patch.id)
            }
        }

        await DB.updatePackageById(this.pkg.id, { applied_patches: this.pkg.applied_patches })

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: this.pkg.id,
            status_text: `${list.length} Patches applied`,
        })

        this.log.info(`${list.length} Patches applied`)

        return this.pkg
    }

    async remove(select) {
        const list = await this.get(select)

        for await (let patch of list) {
            global._relic_eventBus.emit(`pkg:update:state`, {
                id: this.pkg.id,
                status_text: `Removing patch [${patch.id}]...`,
            })

            this.log.info(`Removing patch [${patch.id}]...`)

            if (Array.isArray(patch.additions)) {
                this.log.info(`Removing ${patch.additions.length} Additions...`)

                for await (let addition of patch.additions) {
                    addition.file = await parseStringVars(addition.file, this.pkg)

                    if (!fs.existsSync(addition.file)) {
                        this.log.info(`Addition [${addition.file}] does not exist. Skipping...`)
                        continue
                    }

                    this.log.info(`Removing addition [${addition.file}]`)

                    global._relic_eventBus.emit(`pkg:update:state`, {
                        id: this.pkg.id,
                        status_text: `Removing addition [${addition.file}]`,
                    })

                    await fs.promises.unlink(addition.file)
                }
            }

            this.pkg.applied_patches = this.pkg.applied_patches.filter((p) => {
                return p !== patch.id
            })
        }

        await DB.updatePackageById(this.pkg.id, { applied_patches: this.pkg.applied_patches })

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: this.pkg.id,
            status_text: `${list.length} Patches removed`,
        })

        this.log.info(`${list.length} Patches removed`)

        return this.pkg
    }
}