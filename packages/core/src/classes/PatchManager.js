import fs from "node:fs"

import GenericSteps from "../generic_steps"
import parseStringVars from "../utils/parseStringVars"

export default class PatchManager {
    constructor(pkg, manifest) {
        this.pkg = pkg
        this.manifest = manifest

        this.log = Logger.child({ service: `PATCH-MANAGER|${pkg.id}` })
    }

    async get(patch) {
        if (!this.manifest.patches) {
            return []
        }

        let list = []

        if (typeof patch === "undefined") {
            list = this.manifest.patches
        } else {
            list = this.manifest.patches.find((p) => p.id === patch.id)
        }

        return list
    }

    async patch(patch) {
        const list = await this.get(patch)

        for await (let patch of list) {
            global._relic_eventBus.emit(`pkg:update:state:${this.pkg.id}`, {
                status_text: `Applying patch [${patch.id}]...`,
            })

            this.log.info(`Applying patch [${patch.id}]...`)

            if (Array.isArray(patch.additions)) {
                this.log.info(`Applying ${patch.additions.length} Additions...`)

                for await (let addition of patch.additions) {
                    this.log.info(`Applying addition [${addition.id}]...`)

                    global._relic_eventBus.emit(`pkg:update:state:${this.pkg.id}`, {
                        status_text: `Applying addition [${additions.id}]...`,
                    })

                    // resolve patch file
                    addition.file = await parseStringVars(addition.file, this.pkg)

                    if (fs.existsSync(addition.file)) {
                        this.log.info(`Addition [${addition.file}] already exists. Skipping...`)
                        continue
                    }

                    await GenericSteps(this.pkg, addition.steps, this.log)
                }
            }

            pkg.applied_patches.push(patch.id)
        }

        global._relic_eventBus.emit(`pkg:update:state:${this.pkg.id}`, {
            status_text: `${list.length} Patches applied`,
        })

        this.log.info(`${list.length} Patches applied`)

        return this.pkg
    }

    async remove(patch) {
        const list = await this.get(patch)

        for await (let patch of list) {
            global._relic_eventBus.emit(`pkg:update:state:${this.pkg.id}`, {
                status_text: `Removing patch [${patch.id}]...`,
            })

            Log.info(`Removing patch [${patch.id}]...`)

            if (Array.isArray(patch.additions)) {
                this.log.info(`Removing ${patch.additions.length} Additions...`)

                for await (let addition of patch.additions) {
                    this.log.info(`Removing addition [${addition.id}]...`)

                    global._relic_eventBus.emit(`pkg:update:state:${this.pkg.id}`, {
                        status_text: `Removing addition [${additions.id}]...`,
                    })

                    addition.file = await parseStringVars(addition.file, this.pkg)

                    if (!fs.existsSync(addition.file)) {
                        continue
                    }

                    await fs.promises.unlink(addition.file)
                }
            }

            pkg.applied_patches = pkg.applied_patches.filter((p) => {
                return p !== patch.id
            })
        }

        global._relic_eventBus.emit(`pkg:update:state:${this.pkg.id}`, {
            status_text: `${list.length} Patches removed`,
        })

        this.log.info(`${list.length} Patches removed`)

        return this.pkg
    }
}