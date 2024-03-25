import path from "node:path"
import fs from "node:fs"
import { execa } from "../../lib/execa"

import Vars from "../../vars"

export default class RFS {
    constructor(manifest) {
        this.manifest = manifest
    }

    async mount(remote_dir, to, cb) {
        let mountPoint = path.resolve(this.manifest.install_path)

        if (typeof to === "string") {
            mountPoint = path.join(mountPoint, to)
        } else {
            mountPoint = path.join(mountPoint, "rfs_mount")
        }

        // check if already mounted
        if (fs.existsSync(mountPoint)) {
            return true
        }

        const process = execa(
            Vars.rclone_path,
            [
                "mount",
                "--vfs-cache-mode",
                "full",
                "--http-url",
                remote_dir,
                ":http:",
                mountPoint,
            ], {
            stdout: "inherit",
            stderr: "inherit",
        })

        if (typeof cb === "function") {
            cb(process)
        }

        return process
    }
}