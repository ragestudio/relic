import path from "node:path"
import fs from "node:fs"
import { execa } from "../../lib/execa"

import sendToRender from "../../utils/sendToRender"

import Vars from "../../vars"

const gitCMD = fs.existsSync(Vars.git_path) ? `${Vars.git_path}` : "git"

export default async (manifest, step) => {
    const _path = path.resolve(manifest.install_path, step.path)

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Pulling...`,
    })

    console.log(`[${manifest.id}] steps.git_pull() | Pulling...`)

    fs.mkdirSync(_path, { recursive: true })

    await execa(gitCMD, ["pull"], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    return manifest
}