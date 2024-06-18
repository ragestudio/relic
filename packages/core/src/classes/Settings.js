import fs from "node:fs"
import path from "node:path"
import Vars from "../vars"

const settingsPath = path.resolve(Vars.runtime_path, "settings.json")

export default class Settings {
    static filePath = settingsPath

    static async initialize() {
        if (!fs.existsSync(settingsPath)) {
            await fs.promises.writeFile(settingsPath, "{}")
        }
    }

    static async read() {
        return JSON.parse(await fs.promises.readFile(settingsPath, "utf8"))
    }

    static async write(data) {
        await fs.promises.writeFile(settingsPath, JSON.stringify(data, null, 2))
    }

    static async get(key) {
        const data = await this.read()

        if (key) {
            return data[key]
        }

        return data
    }

    static async has(key) {
        const data = await this.read()

        return key in data
    }

    static async set(key, value) {
        const data = await this.read()

        data[key] = value

        await this.write(data)
    }

    static async delete(key) {
        const data = await this.read()

        delete data[key]

        await this.write(data)

        return data
    }
}