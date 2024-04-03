import Logger from "../logger"

import path from "node:path"
import fs from "node:fs"
import { execa } from "../libraries/execa"

import Vars from "../vars"

export default async (pkg, step) => {
    if (!step.path) {
        step.path = `.`
    }

    const Log = Logger.child({ service: `GIT|${pkg.id}` })

    const gitCMD = fs.existsSync(Vars.git_bin) ? `${Vars.git_bin}` : "git"
    const _path = path.resolve(pkg.install_path, step.path)

    global._relic_eventBus.emit(`pkg:update:state`, {
        id: pkg.id,
        status_text: `Pulling...`,
    })

    Log.info(`Pulling from HEAD...`)

    await execa(gitCMD, ["pull", "--rebase"], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    return pkg
}