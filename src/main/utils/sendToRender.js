import lodash from "lodash"

export default (event, data) => {
    function serializeIpc(data) {
        if (!data) {
            return undefined
        }

        const copy = lodash.cloneDeep(data)

        if (!Array.isArray(copy)) {
            Object.keys(copy).forEach((key) => {
                if (typeof copy[key] === "function") {
                    delete copy[key]
                }
            })
        }

        return copy
    }

    global.win.webContents.send(event, serializeIpc(data))
}