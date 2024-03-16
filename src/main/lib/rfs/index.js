import path from "node:path"
import fs from "node:fs"
import { execa } from "../../lib/execa"
import Vars from "../../vars"

async function readDirRecurse(dir, maxDepth=3, current = 0) {
    if (current > maxDepth) {
        return []
    }

    const files = await fs.promises.readdir(dir)

    const promises = files.map(async (file) => {
        const filePath = path.join(dir, file)
        const stat = await fs.promises.stat(filePath)

        if (stat.isDirectory()) {
            return readDirRecurse(filePath, maxDepth, current + 1)
        }

        return filePath
    })

    return (await Promise.all(promises)).flat()
}

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
        
        await new Promise((r) => {
            setTimeout(r, 1000)
        })

        // // try to read from the mount point
        // let dirs = await readDirRecurse(mountPoint)
        
        // console.log(dirs)

        if (typeof cb === "function") {
            cb(process)
        }

        return process
    }
}