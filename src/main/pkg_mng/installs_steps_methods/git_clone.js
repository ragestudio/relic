import path from "node:path"
import fs from "node:fs"
import ChildProcess from "node:child_process"

import sendToRender from "../../utils/sendToRender"

export default async (manifest, step) => {
    const _path = path.resolve(manifest.install_path, step.path)

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Cloning ${step.url}`,
    })

    console.log(`[${manifest.id}] steps.git_clone() | Cloning ${step.url}...`)

    fs.mkdirSync(_path, { recursive: true })

    await new Promise((resolve, reject) => {
        const process = ChildProcess.exec(`${global.GIT_PATH ?? "git"} clone --recurse-submodules --remote-submodules ${step.url} ${_path}`, {
            shell: true,
        })

        process.on("exit", resolve)
        process.on("error", reject)
    })
}