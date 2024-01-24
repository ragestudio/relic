import lodash from "lodash"

const forbidden = [
    "libraries"
]

export default (event, data) => {
    function serializeIpc(data) {
        if (!data) {
            return undefined
        }

        const copy = lodash.cloneDeep(data)

        if (!Array.isArray(copy)) {
            Object.keys(copy).forEach((key) => {
                if (forbidden.includes(key)) {
                    delete copy[key]
                }

                if (typeof copy[key] === "function") {
                    delete copy[key]
                }
            })
        }

        return copy
    }

    global.win.webContents.send(event, serializeIpc(data))
}