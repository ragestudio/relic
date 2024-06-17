import fs from "node:fs"
import axios from "axios"
import humanFormat from "human-format"
import cliProgress from "cli-progress"

function convertSize(size) {
    return `${humanFormat(size, {
        decimals: 2,
    })}B`
}

export default async (url, destination, progressCallback, abortController) => {
    const progressBar = new cliProgress.SingleBar({
        format: "[{bar}] {percentage}% | {total_formatted} | {speed}/s | {eta_formatted}",
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true
    }, cliProgress.Presets.shades_classic)

    const { data: remoteStream, headers } = await axios.get(url, {
        responseType: "stream",
        signal: abortController?.signal,
    })

    const localStream = fs.createWriteStream(destination)

    let progress = {
        total: Number(headers["content-length"] ?? 0),
        transferred: 0,
        speed: 0,
    }

    let lastTickTransferred = 0

    progressBar.start(progress.total, 0, {
        speed: "0B/s",
        total_formatted: convertSize(progress.total),
    })

    remoteStream.pipe(localStream)

    remoteStream.on("data", (data) => {
        progress.transferred = progress.transferred + Buffer.byteLength(data)
    })

    const progressInterval = setInterval(() => {
        progress.speed = ((progress.transferred ?? 0) - lastTickTransferred) / 1

        lastTickTransferred = progress.transferred ?? 0

        progress.transferredString = convertSize(progress.transferred ?? 0)
        progress.totalString = convertSize(progress.total)
        progress.speedString = convertSize(progress.speed)

        progressBar.update(progress.transferred, {
            speed: progress.speedString,
        })

        if (typeof progressCallback === "function") {
            progressCallback(progress)
        }
    }, 1000)

    await new Promise((resolve, reject) => {
        localStream.on("finish", resolve)
        localStream.on("error", reject)
    })

    progressBar.stop()

    clearInterval(progressInterval)

    return destination
}