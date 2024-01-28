import path from "node:path"
import fs from "node:fs"
import ChildProcess from "node:child_process"

import sendToRender from "../../utils/sendToRender"

import Vars from "../../vars"

const gitCMD = fs.existsSync(Vars.git_path) ? `${Vars.git_path}` : "git"

export default async (manifest, step) => {
    const _path = path.resolve(manifest.install_path, step.path)

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Pulling ${step.url}`,
    })

    console.log(`[${manifest.id}] steps.git_pull() | Pulling ${step.url}...`)

    fs.mkdirSync(_path, { recursive: true })

    await new Promise((resolve, reject) => {
        const process = ChildProcess.exec(`${gitCMD} pull`, {
            cwd: _path,
            shell: true,
        })

        process.on("exit", resolve)
        process.on("error", reject)
    })
}