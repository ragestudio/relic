import open from "open"
import axios from "axios"
import ManifestAuthDB from "../../../classes/ManifestAuthDB"

export default class Auth {
    constructor(ctx) {
        this.manifest = ctx.manifest
    }

    async get() {
        const storagedData = await ManifestAuthDB.get(this.manifest.id)

        if (storagedData && this.manifest.authService) {
            if (!this.manifest.authService.getter) {
                return storagedData
            }

            const result = await axios({
                method: "GET",
                url: this.manifest.authService.getter,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${storagedData}`
                }
            }).catch((err) => {
                global._relic_eventBus.emit("auth:getter:error", err)

                return err
            })

            if (result instanceof Error) {
                throw result
            }

            console.log(result.data)

            return result.data
        }

        return storagedData
    }

    request() {
        if (!this.manifest.authService || !this.manifest.authService.fetcher) {
            return false
        }

        const authURL = this.manifest.authService.fetcher

        open(authURL)
    }
}