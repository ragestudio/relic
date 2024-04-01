import fs from "node:fs"
import path from "node:path"
import downloadHttpFile from "../helpers/downloadHttpFile"

import Vars from "../vars"

export async function readManifest(manifest) {
    // check if manifest is a directory or a url
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi

    const target = manifest?.remote_url ?? manifest

    if (urlRegex.test(target)) {
        if (!fs.existsSync(Vars.cache_path)) {
            fs.mkdirSync(Vars.cache_path, { recursive: true })
        }

        const cachedManifest = await downloadHttpFile(manifest, path.resolve(Vars.cache_path, `${Date.now()}.rmanifest`))

        return {
            remote_manifest: manifest,
            local_manifest: cachedManifest,
            is_catched: true,
            code: fs.readFileSync(cachedManifest, "utf8"),
        }
    } else {
        if (!fs.existsSync(target)) {
            throw new Error(`Manifest not found: ${target}`)
        }

        if (!fs.statSync(target).isFile()) {
            throw new Error(`Manifest is not a file: ${target}`)
        }

        return {
            remote_manifest: undefined,
            local_manifest: target,
            is_catched: false,
            code: fs.readFileSync(target, "utf8"),
        }
    }
}

export default readManifest