import path from "node:path"
import fs from "node:fs"
import upath from "upath"
import { execa } from "../lib/execa"

import sendToRender from "../utils/sendToRender"
import Vars from "../vars"

export default async (manifest, step) => {
    const gitCMD = fs.existsSync(Vars.git_path) ? `${Vars.git_path}` : "git"
    const final_path = upath.normalizeSafe(path.resolve(manifest.install_path, step.path))

    if (!fs.existsSync(final_path)) {
        fs.mkdirSync(final_path, { recursive: true })
    }

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Cloning ${step.url}`,
    })

    console.log(`USING GIT BIN >`, gitCMD)

    console.log(`[${manifest.id}] steps.git_clone() | Cloning ${step.url}...`)

    const args = [
        "clone",
        //`--depth ${step.depth ?? 1}`,
        //"--filter=blob:none",
        //"--filter=tree:0",
        "--recurse-submodules",
        "--remote-submodules",
        step.url,
        final_path,
    ]

    await execa(gitCMD, args, {
        cwd: final_path,
        stdout: "inherit",
        stderr: "inherit",
    })

    return manifest
}