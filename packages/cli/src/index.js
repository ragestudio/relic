import RelicCore from "@ragestudio/relic-core"
import { program, Command, Argument } from "commander"

import pkg from "../package.json"

const commands = [
    {
        cmd: "install",
        description: "Install a package manifest from a path or URL",
        arguments: [
            {
                name: "package_manifest",
                description: "Path or URL to a package manifest",
            }
        ],
        fn: async (package_manifest, options) => {
            await core.initialize()

            return await core.package.install(package_manifest, options)
        }
    },
    {
        cmd: "run",
        description: "Execute a package",
        arguments: [
            {
                name: "id",
                description: "The id of the package to execute",
            }
        ],
        fn: async (pkg_id, options) => {
            await core.initialize()

            return await core.package.execute(pkg_id, options)
        }
    },
    {
        cmd: "update",
        description: "Update a package",
        arguments: [
            {
                name: "id",
                description: "The id of the package to update",
            }
        ],
        fn: async (pkg_id, options) => {
            await core.initialize()

            return await core.package.update(pkg_id, options)
        }
    },
    {
        cmd: "uninstall",
        description: "Uninstall a package",
        arguments: [
            {
                name: "id",
                description: "The id of the package to uninstall",
            }
        ],
        fn: async (pkg_id, options) => {
            await core.initialize()

            return await core.package.uninstall(pkg_id, options)
        }
    },
    {
        cmd: "apply",
        description: "Apply changes to a installed package",
        arguments: [
            {
                name: "id",
                description: "The id of the package to apply changes to",
            },
        ],
        options: [
            {
                name: "add_patches",
                description: "Add patches to the package",
            },
            {
                name: "remove_patches",
                description: "Remove patches from the package",
            },
        ],
        fn: async (pkg_id, options) => {
            await core.initialize()

            return await core.package.apply(pkg_id, options)
        }
    },
    {
        cmd: "list",
        description: "List installed package manifests",
        fn: async () => {
            await core.initialize()

            return console.log(await core.package.list())
        }
    },
    {
        cmd: "open-path",
        description: "Open the base path or a package path",
        options: [
            {
                name: "pkg_id",
                description: "Path to open",
            }
        ],
        fn: async (options) => {
            await core.initialize()

            await core.openPath(options.pkg_id)
        }
    }
]

async function main() {
    global.core = new RelicCore()

    program
        .name(pkg.name)
        .description(pkg.description)
        .version(pkg.version)

    for await (const command of commands) {
        const cmd = new Command(command.cmd).action(command.fn)

        if (command.description) {
            cmd.description(command.description)
        }

        if (Array.isArray(command.arguments)) {
            for await (const argument of command.arguments) {
                if (typeof argument === "string") {
                    cmd.addArgument(new Argument(argument))
                } else {
                    const arg = new Argument(argument.name, argument.description)

                    if (argument.default) {
                        arg.default(argument.default)
                    }

                    cmd.addArgument(arg)
                }
            }
        }

        if (Array.isArray(command.options)) {
            for await (const option of command.options) {
                if (typeof option === "string") {
                    cmd.option(option)
                } else {
                    cmd.option(option.name, option.description, option.default)
                }
            }
        }

        program.addCommand(cmd)
    }

    program.parse()
}


main()