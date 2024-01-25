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
    let _path = path.resolve(manifest.install_path, step.path ?? ".")

    console.log(`[${manifest.id}] steps.drive() | Downloading ${step.id} to ${_path}...`)

    sendToRender(`pkg:update:status:${manifest.id}`, {
        status: "loading",
        statusText: `Downloading file id ${step.id}`,
    })

    if (step.tmp) {
        _path = path.resolve(TMP_PATH, String(new Date().getTime()))
    }

    fs.mkdirSync(path.resolve(_path, ".."), { recursive: true })

    sendToRender(`pkg:update:status:${manifest.id}`, {
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
                sendToRender(`pkg:update:status:${manifest.id}`, {
                    progress: progress,
                    statusText: `Downloaded ${convertSize(progress.transferred ?? 0)} / ${convertSize(progress.length)} | ${convertSize(progress.speed)}/s`,
                })
            }
        )
    })

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