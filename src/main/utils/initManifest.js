import path from "node:path"
import os from "node:os"
import lodash from "lodash"

import Vars from "../vars"
import PublicLibs from "../lib/public_bind"

async function importLib(libs, bindCtx) {
    const libraries = {}

    for await (const lib of libs) {
        if (PublicLibs[lib]) {
            if (typeof PublicLibs[lib] === "function") {
                libraries[lib] = new PublicLibs[lib](bindCtx)
            } else {
                libraries[lib] = PublicLibs[lib]
            }
        }
    }

    return libraries
}

export default async (manifest = {}) => {
    const install_path = path.resolve(Vars.packages_path, manifest.id)
    const os_string = `${os.platform()}-${os.arch()}`

    manifest.install_path = install_path

    if (typeof manifest.init === "function") {
        const init_result = await manifest.init({
            manifest: manifest,
            install_path: install_path,
            os_string: os_string,
        })

        manifest = lodash.merge(manifest, init_result)

        delete manifest.init
    }

    if (Array.isArray(manifest.import_libs)) {
        manifest.libraries = await importLib(manifest.import_libs, {
            id: manifest.id,
            version: manifest.version,
            install_path: install_path,
        })

        console.log(`[${manifest.id}] initManifest() | Using libraries: ${manifest.import_libs.join(", ")}`)
    }

    return manifest
}