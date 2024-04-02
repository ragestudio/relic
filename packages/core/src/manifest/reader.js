import fs from "node:fs"
import path from "node:path"
import axios from "axios"
import checksum from "checksum"

import Vars from "../vars"

export async function readManifest(manifest) {
    // check if manifest is a directory or a url
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi

    const target = manifest?.remote_url ?? manifest

    if (urlRegex.test(target)) {
        if (!fs.existsSync(Vars.cache_path)) {
            fs.mkdirSync(Vars.cache_path, { recursive: true })
        }

        const { data: code } = await axios.get(target)

        const manifestChecksum = checksum(code, { algorithm: "md5" })

        const cachedManifest = path.join(Vars.cache_path, `${manifestChecksum}.rmanifest`)

        await fs.promises.writeFile(cachedManifest, code)

        return {
            remote_manifest: manifest,
            local_manifest: cachedManifest,
            is_catched: true,
            code: code,
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