import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import ChildProcess from "node:child_process"
import { pipeline as streamPipeline } from "node:stream/promises"

import { extractFull } from "node-7z"

import got from "got"

function resolveDestBin(pre, post) {
    let url = null

    if (process.platform === "darwin") {
        url = `${pre}/mac/${process.arch}/${post}`
    }
    else if (process.platform === "win32") {
        url = `${pre}/win/${process.arch}/${post}`
    }
    else {
        url = `${pre}/linux/${process.arch}/${post}`
    }

    return url
}

async function main() {
    const binariesPath = path.resolve(global.RUNTIME_PATH, "bin_lib")

    if (!fs.existsSync(binariesPath)) {
        fs.mkdirSync(binariesPath, { recursive: true })
    }

    const sevenzip_exec = path.resolve(binariesPath, "7z-bin", process.platform === "win32" ? "7za.exe" : "7za")
    const git_exec = path.resolve(binariesPath, "git", process.platform === "win32" ? "git.exe" : "git")

    if (!fs.existsSync(sevenzip_exec)) {
        global.win.webContents.send("initializing_text", "Downloading 7z binaries...")
        console.log(`Downloading 7z binaries...`)

        fs.mkdirSync(path.resolve(binariesPath, "7z-bin"), { recursive: true })

        let url = resolveDestBin(`https://storage.ragestudio.net/rstudio/binaries/7zip-bin`, process.platform === "win32" ? "7za.exe" : "7za")

        await streamPipeline(
            got.stream(url),
            fs.createWriteStream(sevenzip_exec)
        )

        if (os.platform() !== "win32") {
            ChildProcess.execSync("chmod +x " + sevenzip_exec)
        }
    }

    if (!fs.existsSync(git_exec) && process.platform === "win32") {
        global.win.webContents.send("initializing_text", "Downloading GIT binaries...")
        console.log(`Downloading git binaries...`)

        const tempPath = path.resolve(binariesPath, "git-bundle.7z")

        fs.mkdirSync(path.resolve(binariesPath, "git"), { recursive: true })

        let url = resolveDestBin(`https://storage.ragestudio.net/rstudio/binaries/git`, "git-bundle-2.4.0.7z")

        await streamPipeline(
            got.stream(url),
            fs.createWriteStream(tempPath)
        )

        await extractFull(tempPath, path.resolve(binariesPath, "git"), {
            $bin: sevenzip_exec
        })

        if (os.platform() !== "win32") {
            ChildProcess.execSync("chmod +x " + git_exec)
        }
    }

    global.SEVENZIP_PATH = sevenzip_exec
    global.GIT_PATH = git_exec

    console.log(`7z binaries: ${sevenzip_exec}`)
    console.log(`GIT binaries: ${git_exec}`)
}

export default main