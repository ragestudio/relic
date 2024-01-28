import path from "node:path"

global.OS_USERDATA_PATH = path.resolve(
    process.env.APPDATA ||
    (process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share"),
)
global.RUNTIME_PATH = path.join(global.OS_USERDATA_PATH, "rs-bundler")

global.PACKAGES_PATH = path.join(global.RUNTIME_PATH, "packages")
global.BINARIES_PATH = path.resolve(global.RUNTIME_PATH, "bin_lib")

global.LOCAL_DB = path.join(global.RUNTIME_PATH, "local_db.json")

global.SEVENZIP_PATH = path.resolve(global.BINARIES_PATH, "7z-bin", process.platform === "win32" ? "7za.exe" : "7za")
global.GIT_PATH = path.resolve(global.BINARIES_PATH, "git-bin", "bin", process.platform === "win32" ? "git.exe" : "git")

export default {
    binaries_path: global.BINARIES_PATH,

    sevenzip_path: global.SEVENZIP_PATH,
    git_path: global.GIT_PATH,

    runtime_path: global.RUNTIME_PATH,
    packages_path: global.PACKAGES_PATH,
    local_db: global.LOCAL_DB,
}