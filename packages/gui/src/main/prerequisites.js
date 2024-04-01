import resolveDestBin from "@utils/resolveDestBin"
import Vars from "@vars"

const baseURL = "https://storage.ragestudio.net/rstudio/binaries"

export default [
    {
        id: "7zip-bin",
        url: resolveDestBin(`${baseURL}/7zip-bin`, process.platform === "win32" ? "7za.exe" : "7za"),
        destination: Vars.sevenzip_path,
        rewritePermissions: true,
        extract: false,
    },
    {
        id: "git-bin",
        url: resolveDestBin(`${baseURL}/git`, "git-bundle-2.4.0.zip"),
        destination: Vars.git_path,
        rewritePermissions: true,
        extract: true,
    },
    {
        id: "rclone-bin",
        url: resolveDestBin(`${baseURL}/rclone-bin`, "rclone-bin.zip"),
        destination: Vars.rclone_path,
        rewritePermissions: true,
        extract: true,
    },
    {
        id: "java-jdk",
        url: resolveDestBin(`${baseURL}/java-jdk`, "java-jdk.zip"),
        destination: Vars.java_path,
        rewritePermissions: true,
        extract: true,
    },
]