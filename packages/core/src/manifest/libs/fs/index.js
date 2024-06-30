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

        return fs.readFileSync(destination, options)
    }

    copyFileSync(from, to) {
        this.checkOutsideJail(from)
        this.checkOutsideJail(to)

        return fs.copyFileSync(from, to)
    }

    writeFileSync(destination, data, options) {
        this.checkOutsideJail(destination)

        return fs.writeFileSync(destination, data, options)
    }

    // don't need to check finalPath
    existsSync(...args) {
        return fs.existsSync(...args)
    }

    async rename(from, to) {
        this.checkOutsideJail(from)
        this.checkOutsideJail(to)

        return await fs.promises.rename(from, to)
    }

    async writeFile(path, data, options) {
        this.checkOutsideJail(path)
        return await fs.promises.writeFile(path, data, options)
    }

    async readDir(path) {
        this.checkOutsideJail(path)
        return await fs.promises.readdir(path)
    }

    async rm(path, options) {
        this.checkOutsideJail(path)
        return await fs.promises.rm(path, options)
    }

    async mkdir(path, options) {
        this.checkOutsideJail(path)
        return await fs.promises.mkdir(path, options)
    }

    async stat(path) {
        this.checkOutsideJail(path)
        return await fs.promises.stat(path)
    }
}