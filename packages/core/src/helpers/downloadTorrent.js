import fs from "node:fs"
import path from "node:path"
import cliProgress from "cli-progress"
import humanFormat from "human-format"

function convertSize(size) {
    return `${humanFormat(size, {
        decimals: 2,
    })}B`
}

export default async function downloadTorrent(
    magnet,
    destination,
    {
        onStart,
        onProgress,
        onDone,
        onError,
    } = {}
) {
    let progressInterval = null
    let tickProgress = {
        total: 0,
        transferred: 0,
        speed: 0,

        totalString: "0B",
        transferredString: "0B",
        speedString: "0B/s",
    }

    const client = new WebTorrent()

    await new Promise((resolve, reject) => {
        client.add(magnet, (torrentInstance) => {
            const progressBar = new cliProgress.SingleBar({
                format: "[{bar}] {percentage}% | {total_formatted} | {speed}/s | {eta_formatted}",
                barCompleteChar: "\u2588",
                barIncompleteChar: "\u2591",
                hideCursor: true
            }, cliProgress.Presets.shades_classic)

            if (typeof onStart === "function") {
                onStart(torrentInstance)
            }

            progressBar.start(tickProgress.total, 0, {
                speed: "0B/s",
                total_formatted: tickProgress.totalString,
            })

            torrentInstance.on("done", () => {
                progressBar.stop()
                clearInterval(progressInterval)

                if (typeof onDone === "function") {
                    onDone(torrentInstance)
                }

                resolve(torrentInstance)
            })

            torrentInstance.on("error", (error) => {
                progressBar.stop()
                clearInterval(progressInterval)

                if (typeof onError === "function") {
                    onError(error)
                } else {
                    reject(error)
                }
            })

            progressInterval = setInterval(() => {
                tickProgress.speed = torrentInstance.downloadSpeed
                tickProgress.transferred = torrentInstance.downloaded

                tickProgress.transferredString = convertSize(tickProgress.transferred)
                tickProgress.totalString = convertSize(tickProgress.total)
                tickProgress.speedString = convertSize(tickProgress.speed)

                if (typeof onProgress === "function") {
                    onProgress(tickProgress)
                }

                progressBar.update(tickProgress.transferred, {
                    speed: tickProgress.speedString,
                })
            }, 1000)
        })
    })
}