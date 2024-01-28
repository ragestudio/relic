import fs from "node:fs"
import path from "node:path"
import { pipeline as streamPipeline } from "node:stream/promises"

import { extractFull } from "node-7z"
import unzipper from "unzipper"

import Vars from "../vars"

export async function extractFile(file, dest) {
    const ext = path.extname(file)

    console.log(`extractFile() | Extracting ${file} to ${dest}`)

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
                $bin: Vars.sevenzip_path,
            })
            break
        }
        case ".gz": {
            await extractFull(file, dest, {
                $bin: Vars.sevenzip_path
            })
            break
        }
        default:
            throw new Error(`Unsupported file extension: ${ext}`)
    }

    return dest
}

export default extractFile