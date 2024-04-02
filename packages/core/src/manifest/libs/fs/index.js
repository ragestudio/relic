import fs from "node:fs"
import path from "node:path"

// Protect from reading or write operations outside of the package directory
export default class SecureFileSystem {
    constructor(ctx) {
        this.jailPath = ctx.manifest.install_path
    }

    checkOutsideJail(target) {
        // if (!path.resolve(target).startsWith(this.jailPath)) {
        //     throw new Error("Cannot access resource outside of package directory")
        // }
    }

    readFileSync(destination, options) {
        this.checkOutsideJail(destination)

        return fs.readFileSync(finalPath, options)
    }

    copyFileSync(from, to) {
        this.checkOutsideJail(from)
        this.checkOutsideJail(to)

        return fs.copyFileSync(from, to)
    }

    writeFileSync(destination, data, options) {
        this.checkOutsideJail(destination)

        return fs.writeFileSync(finalPath, data, options)
    }

    // don't need to check finalPath
    existsSync(...args) {
        return fs.existsSync(...args)
    }
}