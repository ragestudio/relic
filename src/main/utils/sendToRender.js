import lodash from "lodash"

const forbidden = [
    "libraries"
]

export default (event, data) => {
    try {
        function serializeIpc(data) {
            if (!data) {
                return undefined
            }

            data = JSON.stringify(data)

            data = JSON.parse(data)

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
    } catch (error) {
        console.error(error)
    }
}