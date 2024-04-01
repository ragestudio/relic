import fs from "node:fs"
import got from "got"

export async function fetchAndCreateModule(manifest) {
    console.log(`[${manifest.id}] fetchAndCreateModule() | Fetching ${manifest}...`)

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

export async function readManifest(manifest) {
    // check if manifest is a directory or a url
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi

    const target = manifest?.remote_url ?? manifest

    if (urlRegex.test(target)) {
        const _module = await fetchAndCreateModule(target)

        if (typeof manifest === "object") {
            manifest._original_manifest = {
                ...manifest,
            }

            manifest = {
                ...manifest,
                ..._module.exports,
            }
        } else {
            manifest = _module.exports
        }

        manifest.remote_url = target
    } else {
        if (!fs.existsSync(target)) {
            throw new Error(`Manifest not found: ${target}`)
        }

        if (!fs.statSync(target).isFile()) {
            throw new Error(`Manifest is not a file: ${target}`)
        }

        manifest = require(target)
    }

    return manifest
}

export default readManifest