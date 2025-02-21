import path from "node:path"
import fs from "node:fs"
import os from "node:os"

import downloadHttpFile from "../helpers/downloadHttpFile"
import parseStringVars from "../utils/parseStringVars"
import extractFile from "../utils/extractFile"

export default async (pkg, step, logger, abortController) => {
    if (!step.path) {
        step.path = `./${path.basename(step.url)}`
    }

    step.path = await parseStringVars(step.path, pkg)

    let _path = path.resolve(pkg.install_path, step.path)

    global._relic_eventBus.emit(`pkg:update:state`, {
        id: pkg.id,
        status_text: `Downloading [${step.url}]`,
    })

    logger.info(`Downloading [${step.url} to ${_path}]`)

    if (step.tmp) {
        _path = path.resolve(os.tmpdir(), String(new Date().getTime()), path.basename(step.url))
    }

    fs.mkdirSync(path.resolve(_path, ".."), { recursive: true })

    await downloadHttpFile(
        step.url,
        _path,
        (progress) => {
            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                use_id_only: true,
                status_text: `Downloaded ${progress.transferredString} / ${progress.totalString} | ${progress.speedString}/s`,
            })
        },
        abortController
    )

    logger.info(`Downloaded finished.`)

    if (step.extract) {
        if (typeof step.extract === "string") {
            step.extract = path.resolve(pkg.install_path, step.extract)
        } else {
            step.extract = path.resolve(pkg.install_path, ".")
        }

        global._relic_eventBus.emit(`pkg:update:state`, {
            id: pkg.id,
            status_text: `Extracting bundle...`,
        })

        await extractFile(_path, step.extract)

        if (step.deleteAfterExtract !== false) {
            logger.info(`Deleting temporal file [${_path}]...`)

            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                status_text: `Deleting temporal files...`,
            })

            await fs.promises.rm(_path, { recursive: true })
        }
    }
}