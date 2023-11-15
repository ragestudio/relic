import path from "node:path"
import fs from "node:fs"
import { pipeline as streamPipeline } from "node:stream/promises"

import humanFormat from "human-format"

import got from "got"

import extractFile from "../../utils/extractFile"

function convertSize(size) {
    return `${humanFormat(size, {
        decimals: 2,
    })}B`
}

export default async (manifest, step) => {
    let _path = path.resolve(manifest.packPath, step.path ?? ".")

    console.log(`Downloading ${step.url} to ${_path}...`)

    sendToRenderer(`installation:status`, {
        ...manifest,
        statusText: `Downloading ${step.url}`,
    })

    if (step.tmp) {
        _path = path.resolve(TMP_PATH, String(new Date().getTime()))
    }

    fs.mkdirSync(path.resolve(_path, ".."), { recursive: true })

    if (step.progress) {
        const remoteStream = got.stream(step.url)
        const localStream = fs.createWriteStream(_path)

        let progress = null
        let lastTransferred = 0

        sendToRenderer(`installation:status`, {
            ...manifest,
            statusText: `Starting download...`,
        })

        remoteStream.pipe(localStream)

        remoteStream.on("downloadProgress", (_progress) => {
            progress = _progress
        })

        const progressInterval = setInterval(() => {
            progress.speed = (progress.transferred - lastTransferred) / 1

            lastTransferred = progress.transferred

            sendToRenderer(`installation:${manifest.id}:status`, {
                ...manifest,
                progress: progress,
                statusText: `Downloaded ${convertSize(progress.transferred)} / ${convertSize(progress.total)} | ${convertSize(progress.speed)}/s`,
            })
        }, 1000)

        await new Promise((resolve, reject) => {
            localStream.on("finish", resolve)
            localStream.on("error", reject)
        })

        clearInterval(progressInterval)
    } else {
        await streamPipeline(
            got.stream(step.url),
            fs.createWriteStream(_path)
        )
    }

    if (step.extract) {
        if (typeof step.extract === "string") {
            step.extract = path.resolve(manifest.packPath, step.extract)
        } else {
            step.extract = path.resolve(manifest.packPath, ".")
        }

        sendToRenderer(`installation:status`, {
            ...manifest,
            statusText: `Extracting file...`,
        })

        await extractFile(_path, step.extract)
    }
}