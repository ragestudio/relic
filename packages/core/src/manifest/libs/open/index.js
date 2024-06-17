import Logger from "../../../logger"

import open, { apps } from "open"

const Log = Logger.child({ service: "OPEN-LIB" })

export default {
    spawn: async (...args) => {
        Log.info("Spawning with args >", args)

        return await open(...args)
    },
    apps: apps,
}