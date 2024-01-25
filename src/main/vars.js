import path from "node:path"

global.OS_USERDATA_PATH = path.resolve(
    process.env.APPDATA ||
    (process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share"),
)
global.RUNTIME_PATH = path.join(global.OS_USERDATA_PATH, "rs-bundler")

global.PACKAGES_PATH = path.join(global.RUNTIME_PATH, "packages")

global.LOCAL_DB = path.join(global.RUNTIME_PATH, "local_db.json")

export default {
    runtime_path: global.RUNTIME_PATH,
    packages_path: global.PACKAGES_PATH,
    local_db: global.LOCAL_DB,
}