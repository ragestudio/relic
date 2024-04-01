import resolveRemoteBinPath from "./utils/resolveRemoteBinPath"
import Vars from "./vars"
import path from "node:path"
import axios from "axios"

const baseURL = "https://storage.ragestudio.net/rstudio/binaries"

export default [
    {
        id: "7z-bin",
        finalBin: Vars.sevenzip_bin,
        url: resolveRemoteBinPath(`${baseURL}/7zip-bin`, process.platform === "win32" ? "7za.exe" : "7za"),
        destination: Vars.sevenzip_bin,
        rewriteExecutionPermission: true,
    },
    {
        id: "git-bin",
        finalBin: Vars.git_bin,
        url: resolveRemoteBinPath(`${baseURL}/git`, "git-bundle-2.4.0.zip"),
        destination: path.resolve(Vars.binaries_path, "git-bundle.zip"),
        extract: path.resolve(Vars.binaries_path, "git-bin"),
        requireOs: ["win32"],
        rewriteExecutionPermission: true,
        deleteBeforeExtract: true,
    },
    {
        id: "rclone-bin",
        finalBin: Vars.rclone_bin,
        url: resolveRemoteBinPath(`${baseURL}/rclone-bin`, "rclone-bin.zip"),
        destination: path.resolve(Vars.binaries_path, "rclone-bin.zip"),
        extract: path.resolve(Vars.binaries_path, "rclone-bin"),
        requireOs: ["win32"],
        rewriteExecutionPermission: true,
        deleteBeforeExtract: true,
    },
    {
        id: "java_jre_bin",
        finalBin: Vars.java_jre_bin,
        url: async (os, arch) => {
            const { data } = await axios({
                method: "GET",
                url: "https://api.azul.com/metadata/v1/zulu/packages",
                params: {
                    arch: arch,
                    java_version: "JAVA_22",
                    os: os,
                    archive_type: "zip",
                    javafx_bundled: "false",
                    java_package_type: "jre",
                    page_size: "1",
                }
            })

            return data[0].download_url
        },
        destination: path.resolve(Vars.binaries_path, "java-jre.zip"),
        extract: path.resolve(Vars.binaries_path, "java_jre_bin"),
        extractTargetFromName: true,
        moveDirs: [
            {
                from: path.resolve(Vars.binaries_path, "java_jre_bin", "zulu-22.jre", "Contents"),
                to: path.resolve(Vars.binaries_path, "java_jre_bin", "Contents"),
                deleteParentBefore: true
            }
        ],
        rewriteExecutionPermission: path.resolve(Vars.binaries_path, "java_jre_bin"),
        deleteBeforeExtract: true,
    },
]