import DB from "../db"

export default class ManifestConfigManager {
    constructor(pkg_id) {
        this.pkg_id = pkg_id
        this.config = null
    }

    async initialize() {
        const pkg = await DB.getPackages(this.pkg_id) ?? {}

        this.config = pkg.config
    }

    set(key, value) {
        this.config[key] = value

        DB.updatePackageById(pkg_id, { config: this.config })

        return this.config
    }

    get(key) {
        return this.config[key]
    }

    delete(key) {
        delete this.config[key]

        DB.updatePackageById(pkg_id, { config: this.config })

        return this.config
    }
}