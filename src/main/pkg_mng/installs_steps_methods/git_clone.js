import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import ChildProcess from "node:child_process"

import sendToRender from "../../utils/sendToRender"

import Vars from "../../vars"

const gitCMD = fs.existsSync(Vars.git_path) ? `${Vars.git_path}` : "git"

export default async (manifest, step) => {
    const tmp_path = path.resolve(os.tmpdir(), `rsb_${manifest.id}_clone_${new Date().getTime()}`)
    const final_path = path.resolve(manifest.install_path, step.path)

    if (fs.existsSync(tmp_path)) {
        fs.rmdirSync(tmp_path, { recursive: true })
    }

    if (!fs.existsSync(final_path)) {
        fs.mkdirSync(final_path, { recursive: true })
    }

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Cloning ${step.url}`,
    })

    console.log(`[${manifest.id}] steps.git_clone() | Cloning ${step.url}...`)

    const command = `${gitCMD} clone --recurse-submodules --remote-submodules ${step.url} ${tmp_path}`

    fs.mkdirSync(final_path, { recursive: true })

    await new Promise((resolve, reject) => {
        ChildProcess.exec(
            command,
            {
                shell: true,
            },
            (error, out) => {
                if (error) {
                    console.error(error)
                    reject(error)
                } else {
                    console.log(out)
                    resolve()
                }
            }
        )
    })

    // move tmp_path to final_path
    await fs.promises.rename(tmp_path, final_path)

    if (fs.existsSync(tmp_path)) {
        fs.rmdirSync(tmp_path, { recursive: true })
    }

    return manifest
}