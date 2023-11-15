import fs from "node:fs"
import path from "node:path"
import { pipeline as streamPipeline } from "node:stream/promises"

import { extractFull } from "node-7z"
import unzipper from "unzipper"

export async function extractFile(file, dest) {
    const ext = path.extname(file)

    console.log(`Extracting ${file} to ${dest}...`)

    switch (ext) {
        case ".zip": {
            await streamPipeline(
                fs.createReadStream(file),
                unzipper.Extract({
                    path: dest,
                })
            )
            break
        }
        case ".7z": {
            await extractFull(file, dest, {
                $bin: SEVENZIP_PATH
            })
            break
        }
        default:
            throw new Error(`Unsupported file extension: ${ext}`)
    }

    return dest
}

export default extractFile