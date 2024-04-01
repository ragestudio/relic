import os from "node:os"
import vm from "node:vm"
import path from "node:path"
import ManifestConfigManager from "../classes/ManifestConfig"

import resolveOs from "../utils/resolveOs"
import FetchLibraries from "./libraries"

import Vars from "../vars"

async function BuildManifest(baseClass, context, soft = false) {
    const configManager = new ManifestConfigManager(baseClass.id)

    await configManager.initialize()

    let dependencies = []

    if (Array.isArray(baseClass.useLib)) {
        dependencies = [
            ...dependencies,
            ...baseClass.useLib
        ]
    }

    // inject install_path
    context.install_path = path.resolve(Vars.packages_path, baseClass.id)
    baseClass.install_path = context.install_path

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

export default async (code) => {
    return await new Promise(async (resolve, reject) => {
        try {
            code = injectUseManifest(code)

            const context = {
                Vars: Vars,
                Log: Logger.child({ service: "MANIFEST_VM" }),
                use: (baseClass) => {
                    BuildManifest(baseClass, context).then(resolve)
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