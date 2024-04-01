import open from "open"
import axios from "axios"

export default class Auth {
    constructor(ctx) {
        this.manifest = ctx.manifest
    }

    async get() {
        return {
            assigned_username: "test",
        }

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
        return true
        if (!this.manifest.auth) {
            return false
        }

        const authURL = this.manifest.auth.fetcher

        open(authURL)
    }
}