import path from "node:path"
import upath from "upath"

export default () => {
    return upath.normalizeSafe(path.resolve(
        process.env.APPDATA ||
        (process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share"),
    ))
}