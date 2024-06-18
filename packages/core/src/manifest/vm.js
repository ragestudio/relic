import Logger from "../logger"

import os from "node:os"
import vm from "node:vm"
import path from "node:path"
import ManifestConfigManager from "../classes/ManifestConfig"

import resolveOs from "../utils/resolveOs"
import FetchLibraries from "./libraries"

import Settings from "../classes/Settings"

import Vars from "../vars"

async function BuildManifest(baseClass, context, { soft = false } = {}) {
    const packagesPath = await Settings.get("packages_path") ?? Vars.packages_path
    
    // inject install_path
    context.install_path = path.resolve(packagesPath, baseClass.id)
    baseClass.install_path = context.install_path

    if (soft === true) {
        return baseClass
    }

    const configManager = new ManifestConfigManager(baseClass.id)

    await configManager.initialize()

    let dependencies = []

    if (Array.isArray(baseClass.useLib)) {
        dependencies = [
            ...dependencies,
            ...baseClass.useLib
        ]
    }

    // modify context
    context.Log = Logger.child({ service: `VM|${baseClass.id}` })
    context.Lib = await FetchLibraries(dependencies, {
        manifest: baseClass,
        install_path: context.install_path,
    })
    context.Config = configManager

    // Construct the instance
    const instance = new baseClass()

    instance.install_path = context.install_path

    return instance
}

function injectUseManifest(code) {
    return code + "\n\nuse(Manifest);"
}

export default async (code, { soft = false } = {}) => {
    return await new Promise(async (resolve, reject) => {
        try {
            code = injectUseManifest(code)

            const context = {
                Vars: Vars,
                Log: Logger.child({ service: "MANIFEST_VM" }),
                use: (baseClass) => {
                    return BuildManifest(
                        baseClass,
                        context,
                        {
                            soft: soft,
                        }
                    ).then(resolve)
                },
                os_string: resolveOs(),
                arch: os.arch(),
            }

            vm.createContext(context)

            await vm.runInContext(code, context)
        } catch (error) {
            reject(error)
        }
    })
}