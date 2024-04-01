const path = require("path")
const child_process = require("child_process")

const packagesPath = path.resolve(__dirname, "..", "packages")

const linkRoot = path.resolve(packagesPath, "core")

const linkPackages = [
    path.resolve(packagesPath, "cli"),
    //path.resolve(packagesPath, "gui"),
]

async function main() {
    console.log(`Linking @core to other packages...`)

    const rootPkg = require(path.resolve(linkRoot, "package.json"))

    await child_process.execSync("yarn link", {
        cwd: linkRoot,
        stdio: "inherit",
        stdout: "inherit",
    })

    for (const linkPackage of linkPackages) {
        await child_process.execSync(`yarn link "${rootPkg.name}"`, {
            cwd: linkPackage,
            stdio: "inherit",
            stdout: "inherit",
        })
    }

    console.log(`Done!`)
}

main()