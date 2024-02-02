import path from "node:path"
import fs from "node:fs"
import { execa } from "../../lib/execa"

import sendToRender from "../../utils/sendToRender"

import git_pull from "./git_pull"
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

    console.log(`[${manifest.id}] steps.git_reset() | Fetching from origin`)

    // fetch from origin
    await execa(gitCMD, ["fetch", "origin"], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Cleaning untracked files...`,
    })

    console.log(`[${manifest.id}] steps.git_reset() | Cleaning`)

    await execa(gitCMD, ["clean", "-df"], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Reset from ${from}`,
    })

    // pull the latest
    await git_pull(manifest, step)

    console.log(`[${manifest.id}] steps.git_reset() | Reseting to ${from}`)

    await execa(gitCMD, ["reset", "--hard", from], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    sendToRender(`pkg:update:status`, {
        id: manifest.id,
        statusText: `Checkout to HEAD`,
    })

    console.log(`[${manifest.id}] steps.git_reset() | Checkout to head`)

    await execa(gitCMD, ["checkout", "HEAD"], {
        cwd: _path,
        stdout: "inherit",
        stderr: "inherit",
    })

    return manifest
}