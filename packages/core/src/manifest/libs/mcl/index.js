import Client from "./launcher"
import Authenticator from "./authenticator"

const Log = Logger.child({ service: "MCL" })

export default class MCL {
    /**
     * Asynchronously authenticate the user using the provided username and password.
     *
     * @param {string} username - the username of the user
     * @param {string} password - the password of the user
     * @return {Promise<Object>} the authentication information
     */
    async auth(username, password) {
        return await Authenticator.getAuth(username, password)
    }

    /**
     * Launches a new client with the given options.
     *
     * @param {Object} opts - The options to be passed for launching the client.
     * @return {Promise<Client>} A promise that resolves with the launched client.
     */
    async launch(opts, callbacks) {
        const launcher = new Client()

        launcher.on("debug", (e) => console.log(e))
        launcher.on("data", (e) => console.log(e))
        launcher.on("close", (e) => console.log(e))
        launcher.on("error", (e) => console.log(e))

        if (typeof callbacks === "undefined") {
            callbacks = {
                install: () => {
                    Log.info("Downloading Minecraft assets...")
                },
                init_assets: () => {
                    Log.info("Initializing Minecraft assets...")
                }
            }
        }

        await launcher.launch(opts, callbacks)

        return launcher
    }
}