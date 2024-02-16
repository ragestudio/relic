import path from "node:path"
import fs from "node:fs"
import os from "node:os"

import { pipeline as streamPipeline } from "node:stream/promises"

import humanFormat from "human-format"

import got from "got"

import sendToRender from "../utils/sendToRender"
import extractFile from "../utils/extractFile"

function convertSize(size) {
    return `${humanFormat(size, {
        decimals: 2,
    })}B`
}

export default async (manifest, step) => {
    let _path = path.resolve(manifest.install_path, step.path ?? ".")

    sendToRender(`pkg:update:status:${manifest.id}`, {
        status: "loading",
        statusText: `Downloading ${step.url}`,
    })

    console.log(`[${manifest.id}] steps.http() | Downloading ${step.url} to ${_path}`)

    if (step.tmp) {
        _path = path.resolve(os.tmpdir(), String(new Date().getTime()), path.basename(step.url))
    }

    fs.mkdirSync(path.resolve(_path, ".."), { recursive: true })

    if (step.simple) {
        await streamPipeline(
            got.stream(step.url),
            fs.createWriteStream(_path)
        )
    } else {
        const remoteStream = got.stream(step.url)
        const localStream = fs.createWriteStream(_path)

        let progress = {
            transferred: 0,
            total: 0,
            speed: 0,
        }

        let lastTransferred = 0

        sendToRender(`pkg:update:status:${manifest.id}`, {
            statusText: `Starting download...`,
        })

        remoteStream.pipe(localStream)

        remoteStream.on("downloadProgress", (_progress) => {
            progress = _progress
        })

        const progressInterval = setInterval(() => {
            progress.speed = ((progress.transferred ?? 0) - lastTransferred) / 1

            lastTransferred = progress.transferred ?? 0

            sendToRender(`pkg:update:status:${manifest.id}`, {
                progress: progress,
                statusText: `Downloaded ${convertSize(progress.transferred ?? 0)} / ${convertSize(progress.total)} | ${convertSize(progress.speed)}/s`,
            })
        }, 1000)

        await new Promise((resolve, reject) => {
            localStream.on("finish", resolve)
            localStream.on("error", reject)
        })

        clearInterval(progressInterval)
    }

    if (step.extract) {
        if (typeof step.extract === "string") {
            step.extract = path.resolve(manifest.install_path, step.extract)
        } else {
            step.extract = path.resolve(manifest.install_path, ".")
        }

        sendToRender(`pkg:update:status:${manifest.id}`, {
            statusText: `Extracting bundle...`,
        })

        await extractFile(_path, step.extract)

        if (step.delete_after_extract) {
            sendToRender(`pkg:update:status:${manifest.id}`, {
                statusText: `Deleting temporal files...`,
            })

            await fs.promises.rm(_path, { recursive: true })
        }
    }
}