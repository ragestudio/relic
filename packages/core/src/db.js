import { JSONFilePreset } from "./libraries/lowdb/presets/node"
import Vars from "./vars"
import pkg from "../package.json"
import fs from "node:fs"
import lodash from "lodash"

export default class DB {
    static get defaultRoot() {
        return {
            created_at_version: pkg.version,
            packages: [],
        }
    }

    static defaultPackageState({
        id,
        name,
        version,
        install_path,
        description,
        license,
        last_status,
        remote_manifest,
        local_manifest,
        config,
    }) {
        return {
            id: id,
            name: name,
            version: version,
            install_path: install_path,
            description: description,
            license: license ?? "unlicensed",
            local_manifest: local_manifest ?? null,
            remote_manifest: remote_manifest ?? null,
            applied_patches: [],
            config: typeof config === "object" ? config : {},
            last_status: last_status ?? "installing",
            last_update: null,
            installed_at: null,
        }
    }

    static async withDB() {
        return await JSONFilePreset(Vars.db_path, DB.defaultRoot)
    }

    static async initialize() {
        await this.cleanOrphans()
    }

    static async cleanOrphans() {
        const list = await this.getPackages()

        for (const pkg of list) {
            if (!fs.existsSync(pkg.install_path)) {
                await this.deletePackage(pkg.id)
            }
        }
    }

    static async getPackages(pkg_id) {
        const db = await this.withDB()

        if (pkg_id) {
            return db.data["packages"].find((i) => i.id === pkg_id)
        }

        return db.data["packages"]
    }

    static async writePackage(pkg) {
        const db = await this.withDB()

        await db.update((data) => {
            const prevIndex = data["packages"].findIndex((i) => i.id === pkg.id)

            if (prevIndex !== -1) {
                data["packages"][prevIndex] = pkg
            } else {
                data["packages"].push(pkg)
            }

            return data
        })

        return pkg
    }

    static async updatePackageById(pkg_id, obj) {
        const pkg = await this.getPackages(pkg_id)

        if (!pkg) {
            throw new Error("Package not found")
        }

        pkg = lodash.merge(pkg, obj)

        return await this.writePackage(pkg)
    }

    static async deletePackage(pkg_id) {
        const db = await this.withDB()

        await db.update((data) => {
            data["packages"] = data["packages"].filter((i) => i.id !== pkg_id)

            return data
        })

        return pkg_id
    }
}