import path from "node:path"
import os from "node:os"

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

    return {
        ...manifest,
        packPath: packPath,
        osString: osString,
    }
}