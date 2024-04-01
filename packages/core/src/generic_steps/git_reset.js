import path from "node:path"
import fs from "node:fs"
import { execa } from "../libraries/execa"

import git_pull from "./git_pull"
import Vars from "../vars"

export default async (pkg, step) => {
    if (!step.path) {
        step.path = `.`
    }

    const Log = Logger.child({ service: `GIT|${pkg.id}` })

    const gitCMD = fs.existsSync(Vars.git_path) ? `${Vars.git_path}` : "git"

    const _path = path.resolve(pkg.install_path, step.path)
    const from = step.from ?? "HEAD"

    if (!fs.existsSync(_path)) {
        fs.mkdirSync(_path, { recursive: true })
    }

    Log.info(`Fetching from origin`)

    global._relic_eventBus.emit(`pkg:update:state:${pkg.id}`, {
        status_text: `Fetching from origin...`,
    })

    // fetch from origin
    await execa(gitCMD, ["fetch", "origin"], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    Log.info(`Cleaning untracked files...`)

    global._relic_eventBus.emit(`pkg:update:state:${pkg.id}`, {
        status_text: `Cleaning untracked files...`,
    })

    await execa(gitCMD, ["clean", "-df"], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    Log.info(`Resetting to ${from}`)

    global._relic_eventBus.emit(`pkg:update:state:${pkg.id}`, {
        status_text: `Resetting to ${from}`,
    })

    await execa(gitCMD, ["reset", "--hard", from], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    // pull the latest
    await git_pull(pkg, step)

    Log.info(`Checkout to HEAD`)

    global._relic_eventBus.emit(`pkg:update:state:${pkg.id}`, {
        status_text: `Checkout to HEAD`,
    })

    await execa(gitCMD, ["checkout", "HEAD"], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    return pkg
}