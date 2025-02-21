import fs from "node:fs"
import path from "node:path"

async function chmodRecursive(target, mode) {
    if (fs.lstatSync(target).isDirectory()) {
        const files = await fs.promises.readdir(target, { withFileTypes: true })

        for (const file of files) {
            await chmodRecursive(path.join(target, file.name), mode)
        }
    } else {
        await fs.promises.chmod(target, mode)
    }
}

export default chmodRecursive
