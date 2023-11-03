const os = require("node:os")
const path = require("node:path")
const fs = require("node:fs")
const child_process = require("node:child_process")

async function readImageToB64(_path) {
    const image = fs.readFileSync(_path)
    const extension = path.extname(_path)

    return `data:image/${extension};base64,${image.toString("base64")}`
}

function resolveMcPath() {
    let minecraftGameFolder = null;

    switch (os.type()) {
        case "Darwin":
            minecraftGameFolder = path.join(
                os.homedir(),
                "/Library",
                "Application Support",
                "minecraft"
            )
            break

        case "win32":
        case "Windows_NT":
            minecraftGameFolder = path.join(
                process.env.APPDATA ||
                path.join(os.homedir(), "AppData", "Roaming"),
                ".minecraft"
            )

            break
        default:
            minecraftGameFolder = path.join(os.homedir(), ".minecraft");
            break
    }

    return minecraftGameFolder
}

function resolveMinecraftLauncher(args, cwd) {
    let _path = null

    console.log(os.type())

    switch (os.type()) {
        case "Windows_NT": {
            _path = path.resolve(cwd, "runwin.bat")
            break
        }
        case "Darwin": {
            _path = "/Applications/Minecraft.app/Contents/MacOS/launcher"
            break
        }
        default: {
            _path = null
        }
    }

    if (_path && Array.isArray(args) && os.type() !== "Windows_NT") {
        _path = [_path, ...args].join(" ")
    }

    return _path
}

module.exports = {
    id: global._.pack_id,
    version: global._.version,
    icon: global._.icon,
    pack_name: global._.name,
    description: global._.description,
    author: global._.author,
    configs: {
        assignedRam: 4096,
    },
    executable: true,
    init: ({ pack_dir, tmp_dir }) => {
        const data = {
            git_update: [
                {
                    path: pack_dir,
                    branch: "main",
                    url: global._.gitSource
                }
            ],
            git_clones_steps: [
                {
                    path: pack_dir,
                    branch: "main",
                    url: global._.gitSource
                }
            ],
            http_downloads: [
                {
                    path: `${pack_dir}/icon/mc.png`,
                    url: global._.icon,
                }
            ]
        }

        if (global._.installForge) {
            data.http_downloads.push({
                path: `${pack_dir}/tmp/forge-installer.jar`,
                url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${global._.mcVersion}/forge-${global._.forgeVersion}-installer.jar`,
            })
        }

        return data
    },

    after_install: async ({ manifest, pack_dir, tmp_dir, spinner }) => {
        if (global._.forgeVersion) {
            if (spinner) {
                spinner.color = "yellow"
                spinner.text = `Installing Forge version and libraries...`
            }

            await new Promise((resolve, reject) => {
                const process = child_process.execFile("java", ["-jar", `${pack_dir}/tmp/forge-installer.jar`, "-installClient"], {
                    cwd: pack_dir,
                    shell: true,
                })

                process.on("exit", resolve)
                process.on("error", reject)
            })

            if (spinner) {
                spinner.succeed()
            }
        }

        const profilesFilePath = path.resolve(pack_dir, "launcher_profiles.json")

        let profiles_json = {
            version: 3,
            settings: {
                "crashAssistance": true,
                "enableAdvanced": false,
                "enableAnalytics": true,
                "enableHistorical": false,
                "enableReleases": true,
                "enableSnapshots": false,
                "keepLauncherOpen": false,
                "profileSorting": "ByLastPlayed",
                "showGameLog": false,
                "showMenu": false,
                "soundOn": false
            },
            profiles: {},
        }

        profiles_json.profiles[manifest.id] = {
            name: manifest.pack_name,
            gameDir: pack_dir,
            created: "2023-00-00T00:00:00.002Z",
            javaArgs: `-Xmx${manifest.configs.assignedRam}M -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M`,
            lastVersionId: `${global._.mcVersion}-forge-${global._.forgeVersion}`,
            version: `${global._.mcVersion}-forge-${global._.forgeVersion}`,
            type: "custom",
            icon: await readImageToB64(`${pack_dir}/icon/mc.png`),
        }

        fs.writeFileSync(profilesFilePath, JSON.stringify(profiles_json, null, 2))

        if (os.type() === "Windows_NT") {
            const runwinBat = path.resolve(pack_dir, "runwin.bat")
            fs.writeFileSync(runwinBat, `
@echo off
cd "%ProgramFiles(x86)%/Minecraft Launcher"
start MinecraftLauncher.exe --workDir "${pack_dir}"
`, { encoding: 'utf8' })
        }
    },
    uninstall: async ({ manifest, pack_dir, tmp_dir, spinner }) => {
        const minecraftGameFolder = resolveMcPath()

        const profilesFilePath = path.join(minecraftGameFolder, "launcher_profiles.json")

        if (fs.existsSync(profilesFilePath)) {
            let launcherJSON = fs.readFileSync(profilesFilePath, "utf8")

            launcherJSON = JSON.parse(launcherJSON)

            delete launcherJSON.profiles[manifest.id]

            fs.writeFileSync(profilesFilePath, JSON.stringify(launcherJSON, null, 2))
        }
    },
    execute: async ({ manifest, pack_dir, tmp_dir, spinner }) => {
        const launcherBin = resolveMinecraftLauncher([`--workDir ${pack_dir}`], os.type() === "Windows_NT" ? pack_dir : undefined)

        console.log(launcherBin)

        if (!launcherBin) {
            throw new Error("Minecraft Launcher binary not found")
        }

        await new Promise((resolve, reject) => {
            const process = child_process.execFile(launcherBin, [], {
                shell: true,
            })

            process.on("exit", resolve)
            process.on("error", reject)
        })
    }
}