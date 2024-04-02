import path from "path"
import { JSONFilePreset } from "../libraries/lowdb/presets/node"

import Vars from "../vars"

//! WARNING: Please DO NOT storage any password or sensitive data here, 
// cause its not use any encryption method, and it will be stored in plain text.
// This is intended to store session tokens among other vars.

export default class ManifestAuthService {
    static vaultPath = path.resolve(Vars.runtime_path, "auth.json")

    static async withDB() {
        return await JSONFilePreset(ManifestAuthService.vaultPath, {})
    }

    static has = async (pkg_id) => {
        const db = await this.withDB()

        return !!db.data[pkg_id]
    }

    static set = async (pkg_id, value) => {
        const db = await this.withDB()

        return await db.update((data) => {
            data[pkg_id] = value
        })
    }

    static get = async (pkg_id) => {
        const db = await this.withDB()

        return await db.data[pkg_id]
    }
}