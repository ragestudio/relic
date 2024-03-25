import open from "open"
import axios from "axios"
import sendToRender from "../../utils/sendToRender"

export default class Auth {
    constructor(manifest) {
        this.manifest = manifest

        console.log(this.manifest)
    }

    async get() {
        const authData = global.authService.getAuth(this.manifest.id)

        console.log(authData)

        if (authData && this.manifest.auth && this.manifest.auth.getter) {
            const result = await axios({
                method: "POST",
                url: this.manifest.auth.getter,
                headers: {
                    "Content-Type": "application/json",
                },
                data: {
                    auth_data: authData,
                }
            }).catch((err) => {
                sendToRender(`new:notification`, {
                    type: "error",
                    message: "Failed to authorize",
                    description: err.response.data.message ?? err.response.data.error ?? err.message,
                    duration: 10
                })

                return err
            })

            if (result instanceof Error) {
                throw result
            }

            console.log(result.data)
            
            return result.data
        }

        return authData
    }

    request() {
        if (!this.manifest.auth) {
            return false
        }

        const authURL = this.manifest.auth.fetcher

        open(authURL)
    }
}