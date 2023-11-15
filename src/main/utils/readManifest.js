import path from "node:path"
import fs from "node:fs"

import lodash from "lodash"
import got from "got"

export async function fetchAndCreateModule(manifest) {
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

export async function readManifest(manifest, { just_read = false } = {}) {
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

export default readManifest