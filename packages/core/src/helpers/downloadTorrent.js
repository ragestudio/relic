import fs from "node:fs"
import path from "node:path"
import cliProgress from "cli-progress"
import humanFormat from "human-format"
import aria2 from "aria2"

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

    const client = new aria2({
        host: 'localhost',
        port: 6800,
        secure: false,
        secret: '',
        path: '/jsonrpc'
    })

    await client.open()

    let downloadId = await client.call(
        "addUri",
        [magnet],
        {
            dir: destination,
        },
    )

    await new Promise(async (resolve, reject) => {
        if (typeof onStart === "function") {
            onStart()
        }

        progressInterval = setInterval(async () => {
            const data = await client.call("tellStatus", downloadId)
            const isMetadata = data.totalLength === "0" && data.status === "active"

            console.log(data)

            if (data.status === "complete") {
                if (Array.isArray(data.followedBy) && data.followedBy[0]) {
                    // replace downloadId
                    downloadId = data.followedBy[0]
                }
            }

            tickProgress.total = parseInt(data.totalLength)
            tickProgress.speed = parseInt(data.downloadSpeed)
            tickProgress.transferred = parseInt(data.completedLength)
            tickProgress.connections = data.connections

            tickProgress.transferredString = convertSize(tickProgress.transferred)
            tickProgress.totalString = convertSize(tickProgress.total)
            tickProgress.speedString = convertSize(tickProgress.speed)

            if (typeof onProgress === "function") {
                onProgress(tickProgress)
            }
        }, 1000)

        client.on("onDownloadStart", async ([{ gid }]) => {
            const data = await client.call("tellStatus", gid)

            console.log(data)

            if (typeof data.following !== "undefined") {
                if (data.following === downloadId) {
                    downloadId = data.gid
                }
            }
        })

        client.on("onBtDownloadComplete", ([{ gid }]) => {
            if (gid !== downloadId) {
                return false
            }

            clearInterval(progressInterval)

            if (typeof onDone === "function") {
                onDone()
            }

            resolve({
                downloadId,
            })

            return null
        })

        client.on("onDownloadError", ([{ gid }]) => {
            if (gid !== downloadId) {
                return false
            }

            clearInterval(progressInterval)

            if (typeof onError === "function") {
                onError()
            } else {
                reject()
            }
        })
    })

    await client.call("remove", downloadId)

    return downloadId
}