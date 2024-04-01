import { safeStorage } from "electron"
import sendToRender from "./utils/sendToRender"

export default class AuthService {
    authorize(pkg_id, token) {
        console.log("Authorizing", pkg_id, token)
        global.SettingsStore.set(`auth:${pkg_id}`, safeStorage.encryptString(token))

        sendToRender(`new:notification`, {
            message: "Authorized",
            description: "Now you can start this package",
        })

        return true
    }

    unauthorize(pkg_id) {
        global.SettingsStore.delete(`auth:${pkg_id}`)

        return true
    }

    getAuth(pkg_id) {
        const value = global.SettingsStore.get(`auth:${pkg_id}`)

        if (!value) {
            return null
        }

        console.log("getAuth", value)

        return safeStorage.decryptString(Buffer.from(value.data))
    }
}