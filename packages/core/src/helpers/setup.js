import Logger from "../logger"

const Log = Logger.child({ service: "SETUP" })

import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import admzip from "adm-zip"
import resolveOs from "../utils/resolveOs"
import chmodRecursive from "../utils/chmodRecursive"

import downloadFile from "../helpers/downloadHttpFile"

import Vars from "../vars"
import Prerequisites from "../prerequisites"

export default async () => {
    if (!fs.existsSync(Vars.binaries_path)) {
        Log.info(`Creating binaries directory: ${Vars.binaries_path}...`)
        await fs.promises.mkdir(Vars.binaries_path, { recursive: true })
    }

    for await (let prerequisite of Prerequisites) {
        try {
            Log.info(`Checking prerequisite: ${prerequisite.id}...`)

            if (Array.isArray(prerequisite.requireOs) && !prerequisite.requireOs.includes(os.platform())) {
                Log.info(`Prerequisite: ${prerequisite.id} is not required for this os.`)
                continue
            }

            if (!fs.existsSync(prerequisite.finalBin)) {
                Log.info(`Missing prerequisite: ${prerequisite.id}, installing...`)

                if (fs.existsSync(prerequisite.destination)) {
                    Log.info(`Deleting temporal file [${prerequisite.destination}]`)
                    await fs.promises.rm(prerequisite.destination)
                }

                if (fs.existsSync(prerequisite.extract)) {
                    Log.info(`Deleting temporal directory [${prerequisite.extract}]`)
                    await fs.promises.rm(prerequisite.extract, { recursive: true })
                }

                Log.info(`Creating base directory: ${Vars.binaries_path}/${prerequisite.id}...`)
                await fs.promises.mkdir(path.resolve(Vars.binaries_path, prerequisite.id), { recursive: true })

                if (typeof prerequisite.url === "function") {
                    prerequisite.url = await prerequisite.url(resolveOs(), os.arch())
                    Log.info(`Resolved url: ${prerequisite.url}`)
                }

                Log.info(`Downloading ${prerequisite.id} from [${prerequisite.url}] to destination [${prerequisite.destination}]...`)

                try {
                    await downloadFile(
                        prerequisite.url,
                        prerequisite.destination
                    )
                } catch (error) {
                    await fs.promises.rm(prerequisite.destination)

                    throw error
                }

                if (typeof prerequisite.extract === "string") {
                    Log.info(`Extracting ${prerequisite.id} to destination [${prerequisite.extract}]...`)

                    const zip = new admzip(prerequisite.destination)

                    await zip.extractAllTo(prerequisite.extract, true)

                    Log.info(`Extraction ok...`)
                }

                if (prerequisite.extractTargetFromName === true) {
                    let name = path.basename(prerequisite.url)
                    const ext = path.extname(name)

                    name = name.replace(ext, "")

                    if (fs.existsSync(path.resolve(prerequisite.extract, name))) {
                        await fs.promises.rename(path.resolve(prerequisite.extract, name), `${prerequisite.extract}_old`)
                        await fs.promises.rm(prerequisite.extract, { recursive: true })
                        await fs.promises.rename(`${prerequisite.extract}_old`, prerequisite.extract)
                    }
                }

                if (prerequisite.deleteBeforeExtract === true) {
                    Log.info(`Deleting temporal file [${prerequisite.destination}]`)
                    await fs.promises.unlink(prerequisite.destination)
                }

                if (typeof prerequisite.rewriteExecutionPermission !== "undefined") {
                    const to = typeof prerequisite.rewriteExecutionPermission === "string" ?
                        prerequisite.rewriteExecutionPermission :
                        prerequisite.finalBin

                    Log.info(`Rewriting permissions to ${to}...`)
                    await chmodRecursive(to, 0o755)
                }

                if (Array.isArray(prerequisite.moveDirs)) {
                    for (const dir of prerequisite.moveDirs) {
                        Log.info(`Moving ${dir.from} to ${dir.to}...`)

                        await fs.promises.rename(dir.from, dir.to)

                        if (dir.deleteParentBefore === true) {
                            await fs.promises.rm(path.dirname(dir.from), { recursive: true })
                        }
                    }
                }
            }

            Log.info(`Prerequisite: ${prerequisite.id} is ready!`)
        } catch (error) {
            Log.error(error)
            Log.error("Aborting setup due to an error...")
            return false
        }

        Log.info(`All prerequisites are ready!`)
    }
}