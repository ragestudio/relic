import path from "node:path"
import fs from "node:fs"
import ChildProcess from "node:child_process"

export default async (manifest, step) => {
    const _path = path.resolve(manifest.packPath, step.path)

    console.log(`Pulling ${step.url}...`)

    sendToRenderer(`installation:status`, {
        ...manifest,
        statusText: `Pulling ${step.url}`,
    })

    fs.mkdirSync(_path, { recursive: true })

    await new Promise((resolve, reject) => {
        const process = ChildProcess.exec(`${global.GIT_PATH ?? "git"} pull`, {
            cwd: _path,
            shell: true,
        })

        process.on("exit", resolve)
        process.on("error", reject)
    })
}