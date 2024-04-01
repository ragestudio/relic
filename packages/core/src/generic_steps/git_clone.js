import path from "node:path"
import fs from "node:fs"
import upath from "upath"
import { execa } from "../libraries/execa"

import Vars from "../vars"

export default async (pkg, step) => {
    if (!step.path) {
        step.path = `.`
    }

    const Log = Logger.child({ service: `GIT|${pkg.id}` })

    const gitCMD = fs.existsSync(Vars.git_path) ? `${Vars.git_path}` : "git"
    const final_path = upath.normalizeSafe(path.resolve(pkg.install_path, step.path))

    if (!fs.existsSync(final_path)) {
        fs.mkdirSync(final_path, { recursive: true })
    }

    Log.info(`Cloning from [${step.url}]`)

    global._relic_eventBus.emit(`pkg:update:state:${pkg.id}`, {
        status_text: `Cloning from [${step.url}]...`,
    })

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

    return pkg
}