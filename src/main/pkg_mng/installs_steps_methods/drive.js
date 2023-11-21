import path from "node:path"
import fs from "node:fs"

import humanFormat from "human-format"

import got from "got"

import sendToRender from "../../utils/sendToRender"
import extractFile from "../../utils/extractFile"

import GoogleDriveAPI from "../../lib/google_drive"

function convertSize(size) {
    return `${humanFormat(size, {
        decimals: 2,
    })}B`
}

export default async (manifest, step) => {
    let _path = path.resolve(manifest.packPath, step.path ?? ".")

    console.log(`Downloading ${step.id} to ${_path}...`)

    sendToRender(`installation:status`, {
        ...manifest,
        statusText: `Downloading file id ${step.id}`,
    })

    if (step.tmp) {
        _path = path.resolve(TMP_PATH, String(new Date().getTime()))
    }

    fs.mkdirSync(path.resolve(_path, ".."), { recursive: true })

    sendToRender(`installation:status`, {
        ...manifest,
        statusText: `Starting download...`,
    })

    // Download file from drive
    await new Promise((resolve, reject) => {
        GoogleDriveAPI.operations.downloadFile(
            step.id,
            _path,
            (err) => {
                if (err) {
                    return reject(err)
                }

                return resolve()
            },
            (progress) => {
                sendToRender(`installation:${manifest.id}:status`, {
                    ...manifest,
                    progress: progress,
                    statusText: `Downloaded ${convertSize(progress.transferred ?? 0)} / ${convertSize(progress.length)} | ${convertSize(progress.speed)}/s`,
                })
            }
        )
    })

    if (step.extract) {
        if (typeof step.extract === "string") {
            step.extract = path.resolve(manifest.packPath, step.extract)
        } else {
            step.extract = path.resolve(manifest.packPath, ".")
        }

        sendToRender(`installation:status`, {
            ...manifest,
            statusText: `Extracting bundle...`,
        })

        await extractFile(_path, step.extract)

        if (step.delete_after_extract) {
            sendToRender(`installation:status`, {
                ...manifest,
                statusText: `Deleting temporal files...`,
            })

            await fs.promises.rm(_path, { recursive: true })
        }
    }
}