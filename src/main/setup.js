import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import ChildProcess from "node:child_process"
import { pipeline as streamPipeline } from "node:stream/promises"

import unzipper from "unzipper"
import got from "got"

import Vars from "./vars"

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
    const binariesPath = Vars.binaries_path

    if (!fs.existsSync(binariesPath)) {
        fs.mkdirSync(binariesPath, { recursive: true })
    }

    let sevenzip_exec = Vars.sevenzip_path
    let git_exec = Vars.git_path
    let rclone_exec = Vars.rclone_path

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

    if (!fs.existsSync(git_exec)) {
        if (process.platform !== "win32") {
            return git_exec = null
        }

        const tempPath = path.resolve(binariesPath, "git-bundle.zip")
        const binPath = path.resolve(binariesPath, "git-bin")

        if (!fs.existsSync(tempPath)) {
            global.win.webContents.send("initializing_text", "Downloading GIT binaries...")
            console.log(`Downloading git binaries...`)

            let url = resolveDestBin(`https://storage.ragestudio.net/rstudio/binaries/git`, "git-bundle-2.4.0.zip")

            await streamPipeline(
                got.stream(url),
                fs.createWriteStream(tempPath)
            )
        }

        global.win.webContents.send("initializing_text", "Extracting GIT binaries...")
        console.log(`Extracting GIT...`)

        await new Promise((resolve, reject) => {
            fs.createReadStream(tempPath).pipe(unzipper.Extract({ path: binPath })).on("close", resolve).on("error", reject)
        })

        fs.unlinkSync(tempPath)
    }

    if (!fs.existsSync(Vars.rclone_path)) {
        console.log(`Downloading rclone binaries...`)
        global.win.webContents.send("initializing_text", "Downloading rclone binaries...")

        const tempPath = path.resolve(binariesPath, "rclone-bin.zip")

        let url = resolveDestBin(`https://storage.ragestudio.net/rstudio/binaries/rclone`, "rclone-bin.zip")

        await streamPipeline(
            got.stream(url),
            fs.createWriteStream(tempPath)
        )

        global.win.webContents.send("initializing_text", "Extracting rclone binaries...")

        await new Promise((resolve, reject) => {
            fs.createReadStream(tempPath).pipe(unzipper.Extract({ path: path.resolve(binariesPath, "rclone-bin") })).on("close", resolve).on("error", reject)
        })

        if (os.platform() !== "win32") {
            ChildProcess.execSync("chmod +x " + Vars.rclone_path)
        }

        fs.unlinkSync(tempPath)
    }

    if (!fs.existsSync(Vars.java_path)) {
        console.log(`Downloading java binaries...`)
        global.win.webContents.send("initializing_text", "Downloading Java JDK...")

        const tempPath = path.resolve(binariesPath, "java-jdk.zip")

        let url = resolveDestBin(`https://storage.ragestudio.net/rstudio/binaries/java`, "java-jdk.zip")

        await streamPipeline(
            got.stream(url),
            fs.createWriteStream(tempPath)
        )

        global.win.webContents.send("initializing_text", "Extracting JAVA...")

        await new Promise((resolve, reject) => {
            fs.createReadStream(tempPath).pipe(unzipper.Extract({ path: path.resolve(binariesPath, "java-jdk") })).on("close", resolve).on("error", reject)
        })

        if (os.platform() !== "win32") {
            ChildProcess.execSync("chmod +x " + Vars.rclone_path)
        }

        fs.unlinkSync(tempPath)
    }

    console.log(`7z binaries: ${sevenzip_exec}`)
    console.log(`GIT binaries: ${git_exec}`)
    console.log(`rclone binaries: ${rclone_exec}`)
    console.log(`JAVA jdk: ${Vars.java_path}`)
}

export default main