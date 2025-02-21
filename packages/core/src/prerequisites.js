import resolveRemoteBinPath from "./utils/resolveRemoteBinPath"
import Vars from "./vars"
import path from "node:path"
import axios from "axios"

const baseURL = "https://storage.ragestudio.net/rstudio/binaries"

export default [
    {
        id: "7z-bin",
        finalBin: Vars.sevenzip_bin,
        url: resolveRemoteBinPath(`${baseURL}/7z-full`, "7z.zip"),
        destination: path.resolve(Vars.binaries_path, "7z.zip"),
        extract: path.resolve(Vars.binaries_path, "7z-bin"),
        rewriteExecutionPermission: true,
        deleteBeforeExtract: true,
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
        id: "aria2",
        finalBin: Vars.aria2_bin,
        url: async (os, arch) => {
            return `https://storage.ragestudio.net/rstudio/binaries/aria2/${os}/${arch}/${os === "win32" ? "aria2c.exe" : "aria2c"}`
        },
        destination: Vars.aria2_bin,
        rewriteExecutionPermission: Vars.aria2_bin,
    },
    {
        id: "java22_jre_bin",
        finalBin: Vars.java22_jre_bin,
        url: async (os, arch) => {
            const { data } = await axios({
                method: "GET",
                url: "https://api.azul.com/metadata/v1/zulu/packages",
                params: {
                    arch: arch,
                    java_version: "22",
                    os: os === "win32" ? "windows" : os,
                    archive_type: "zip",
                    javafx_bundled: "false",
                    java_package_type: "jre",
                    page_size: "1",
                }
            })

            return data[0].download_url
        },
        destination: path.resolve(Vars.binaries_path, "java22-jre.zip"),
        extract: path.resolve(Vars.binaries_path, "java22_jre_bin"),
        extractTargetFromName: true,
        moveDirs: [
            {
                requireOs: ["macos"],
                from: path.resolve(Vars.binaries_path, "java22_jre_bin", "zulu-22.jre", "Contents"),
                to: path.resolve(Vars.binaries_path, "java22_jre_bin", "Contents"),
                deleteParentBefore: true
            }
        ],
        rewriteExecutionPermission: path.resolve(Vars.binaries_path, "java22_jre_bin"),
        deleteBeforeExtract: true,
    },
    {
        id: "java17_jre_bin",
        finalBin: Vars.java17_jre_bin,
        url: async (os, arch) => {
            const { data } = await axios({
                method: "GET",
                url: "https://api.azul.com/metadata/v1/zulu/packages",
                params: {
                    arch: arch,
                    java_version: "17",
                    os: os === "win32" ? "windows" : os,
                    archive_type: "zip",
                    javafx_bundled: "false",
                    java_package_type: "jre",
                    page_size: "1",
                }
            })

            return data[0].download_url
        },
        destination: path.resolve(Vars.binaries_path, "java17-jre.zip"),
        extract: path.resolve(Vars.binaries_path, "java17_jre_bin"),
        extractTargetFromName: true,
        moveDirs: [
            {
                requireOs: ["macos"],
                from: path.resolve(Vars.binaries_path, "java17_jre_bin", "zulu-17.jre", "Contents"),
                to: path.resolve(Vars.binaries_path, "java17_jre_bin", "Contents"),
                deleteParentBefore: true
            }
        ],
        rewriteExecutionPermission: path.resolve(Vars.binaries_path, "java17_jre_bin"),
        deleteBeforeExtract: true,
    },
]