import path from "node:path"

import parseStringVars from "../utils/parseStringVars"
//import downloadTorrent from "../helpers/downloadTorrent"

export default async (pkg, step, logger, abortController) => {
    throw new Error("Not implemented")
    
    if (typeof step.path === "undefined") {
        step.path = `.`
    }

    step.path = await parseStringVars(step.path, pkg)

    let _path = path.resolve(pkg.install_path, step.path)

    global._relic_eventBus.emit(`pkg:update:state`, {
        id: pkg.id,
        status_text: `Preparing torrent...`,
    })

    logger.info(`Preparing torrent with magnet => [${step.magnet}]`)

    if (step.tmp) {
        _path = path.resolve(os.tmpdir(), String(new Date().getTime()))
    }

    const parentDir = path.resolve(_path, "..")

    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true })
    }

    await downloadTorrent(step.magnet, _path, {
        onProgress: (progress) => {
            global._relic_eventBus.emit(`pkg:update:state`, {
                id: pkg.id,
                use_id_only: true,
                status_text: `Downloaded ${progress.transferredString} / ${progress.totalString} | ${progress.speedString}/s`,
            })
        }
    })

}