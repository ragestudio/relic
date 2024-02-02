import path from "node:path"
import fs from "node:fs"
import ChildProcess from "node:child_process"

import sendToRender from "../../utils/sendToRender"

import Vars from "../../vars"

const gitCMD = fs.existsSync(Vars.git_path) ? `${Vars.git_path}` : "git"

export default async (manifest, step) => {
    const _path = path.resolve(manifest.install_path, step.path)
    const from = step.from ?? "HEAD"

    if (!fs.existsSync(_path)) {
        fs.mkdirSync(_path, { recursive: true })
    }

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Fetching from origin...`,
    })

    console.log(`[${manifest.id}] steps.git_reset() | Fetching from origin...`)

    // fetch from origin
    await new Promise((resolve, reject) => {
        ChildProcess.exec(
            `${gitCMD} fetch origin`,
            {
                cwd: _path,
                shell: true,
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

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Cleaning untracked files...`,
    })

    console.log(`[${manifest.id}] steps.git_reset() | Cleaning...`)

    await new Promise((resolve, reject) => {
        ChildProcess.exec(
            `${gitCMD} clean -df`,
            {
                cwd: _path,
                shell: true,
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

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Reset from ${from}`,
    })

    console.log(`[${manifest.id}] steps.git_reset() | Reseting to ${from}...`)

    await new Promise((resolve, reject) => {
        ChildProcess.exec(
            `${gitCMD} reset --hard ${from}`,
            {
                cwd: _path,
                shell: true,
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
}