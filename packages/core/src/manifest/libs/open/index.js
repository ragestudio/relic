import open, { apps } from "open"

const Log = Logger.child({ service: "OPEN-LIB" })

export default {
    spawn: async (...args) => {
        Log.info("Open spawned with args >")
        console.log(...args)

        return await open(...args)
    },
    apps: apps,
}