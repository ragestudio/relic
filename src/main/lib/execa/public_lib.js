import { execa } from "."
import path from "node:path"

export default class ExecLib {
    constructor(manifest) {
        this.manifest = manifest
    }

    async file(file, args, options) {
        file = path.resolve(this.manifest.install_path, file)

        return await execa(file, [...args], {
            ...options,
            cwd: this.manifest.install_path,
        })
    }
}