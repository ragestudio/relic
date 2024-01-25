import path from "node:path"
import fs from "node:fs"
import ChildProcess from "node:child_process"

import sendToRender from "../../utils/sendToRender"

export default async (manifest, step) => {
    const _path = path.resolve(manifest.install_path, step.path)

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Pulling ${step.url}`,
    })

    console.log(`[${manifest.id}] steps.git_pull() | Pulling ${step.url}...`)

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