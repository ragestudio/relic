import fs from "node:fs"
import path from "node:path"

async function readDirRecurse(dir, maxDepth = 3, current = 0) {
    if (current > maxDepth) {
        return []
    }

    const files = await fs.promises.readdir(dir)

    const promises = files.map(async (file) => {
        const filePath = path.join(dir, file)
        const stat = await fs.promises.stat(filePath)

        if (stat.isDirectory()) {
            return readDirRecurse(filePath, maxDepth, current + 1)
        }

        return filePath
    })

    return (await Promise.all(promises)).flat()
}

export default readDirRecurse