import path from "node:path"
import os from "node:os"

import PublicLibs from "../public_libraries"

async function importLib(libs) {
    const libraries = {}

    for (const lib of libs) {
        if (PublicLibs[lib]) {
            libraries[lib] = PublicLibs[lib]
        }
    }

    return libraries
}

export default async (manifest = {}) => {
    const packPath = path.resolve(INSTALLERS_PATH, manifest.id)

    const osString = `${os.platform()}-${os.arch()}`

    if (typeof manifest.init === "function") {
        const init_result = await manifest.init({
            pack_dir: packPath,
            tmp_dir: TMP_PATH,
            os_string: osString,
        })

        manifest = {
            ...manifest,
            ...init_result,
        }

        delete manifest.init
    }

    if (Array.isArray(manifest.import_libs)) {
        manifest.libraries = await importLib(manifest.import_libs)
        console.log(`Imported libraries: ${manifest.import_libs.join(", ")}`)
    }

    return {
        ...manifest,
        packPath: packPath,
        osString: osString,
    }
}