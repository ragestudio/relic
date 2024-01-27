
import path from "node:path"
import fs from "node:fs"
import ChildProcess from "node:child_process"

import sendToRender from "../../utils/sendToRender"

export default async (manifest, step) => {
    const _path = path.resolve(manifest.install_path, step.path)
    const from = step.from ?? "origin/main"

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Reset from ${from}`,
    })

    console.log(`[${manifest.id}] steps.git_reset() | Reseting to ${from}...`)

    fs.mkdirSync(_path, { recursive: true })

    await new Promise((resolve, reject) => {
        const process = ChildProcess.exec(`${global.GIT_PATH ?? "git"} reset --hard ${from}`, {
            cwd: _path,
            shell: true,
        })

        process.on("exit", resolve)
        process.on("error", reject)
    })
}