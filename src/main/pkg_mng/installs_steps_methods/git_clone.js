import path from "node:path"
import fs from "node:fs"
import ChildProcess from "node:child_process"
import upath from "upath"

import sendToRender from "../../utils/sendToRender"
import Vars from "../../vars"

const gitCMD = fs.existsSync(Vars.git_path) ? `${Vars.git_path}` : "git"

export default async (manifest, step) => {
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

    const command = [
        gitCMD,
        "clone",
        //`--depth ${step.depth ?? 1}`,
        //"--filter=blob:none",
        //"--filter=tree:0",
        "--recurse-submodules",
        "--remote-submodules",
        step.url,
        final_path,
    ]

    await new Promise((resolve, reject) => {
        ChildProcess.exec(
            command.join(" "),
            {
                shell: true,
                cwd: final_path,
            },
            (error, out) => {
                if (error) {
                    console.error(error)
                    return reject(error)
                }

                console.log(out)
                return resolve()
            }
        )
    })

    return manifest
}