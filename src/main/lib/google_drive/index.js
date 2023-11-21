import fs from "node:fs"
import path from "node:path"

const ElectronGoogleOAuth2 = require("@getstation/electron-google-oauth2").default

import { ipcMain } from "electron"
import progressHandler from "progress-stream"

import { google } from "googleapis"

import { safeStorage } from "electron"

import sendToRender from "../../utils/sendToRender"

export default class GoogleDriveAPI {
    static async createClientAuthFromCredentials(credentials) {
        return await google.auth.fromJSON(credentials)
    }

    static async getDriveInstance() {
        const credentials = await GoogleDriveAPI.readCredentials()

        if (!credentials) {
            throw new Error("No credentials or auth found")
        }

        const client = await GoogleDriveAPI.createClientAuthFromCredentials(credentials)

        return google.drive({
            version: "v3",
            auth: client,
        })
    }

    static async readCredentials() {
        const encryptedValue = global.SettingsStore.get("drive_auth")

        if (!encryptedValue) {
            return null
        }

        const decryptedValue = safeStorage.decryptString(Buffer.from(encryptedValue, "latin1"))

        if (!decryptedValue) {
            return null
        }

        return JSON.parse(decryptedValue)
    }

    static async saveCredentials(credentials) {
        const payload = {
            type: "authorized_user",
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token,
        }

        const encryptedBuffer = safeStorage.encryptString(JSON.stringify(payload))

        global.SettingsStore.set("drive_auth", encryptedBuffer.toString("latin1"))

        console.log("Saved Drive credentials...",)
    }

    static async authorize() {
        console.log("Authorizing Google Drive...")

        const auth = await global._drive_oauth.openAuthWindowAndGetTokens()

        await GoogleDriveAPI.saveCredentials({
            ...auth,
            client_id: import.meta.env.MAIN_VITE_DRIVE_ID,
            client_secret: import.meta.env.MAIN_VITE_DRIVE_SECRET,
        })

        await sendToRender("drive:authorized")

        return auth
    }

    static async unauthorize() {
        console.log("unauthorize Google Drive...")

        global.SettingsStore.delete("drive_auth")

        await sendToRender("drive:unauthorized")
    }

    static async init() {
        console.log("Initializing Google Drive...")

        global._drive_oauth = new ElectronGoogleOAuth2(
            import.meta.env.MAIN_VITE_DRIVE_ID,
            import.meta.env.MAIN_VITE_DRIVE_SECRET,
            ["https://www.googleapis.com/auth/drive.readonly"],
        )

        // register ipc events
        for (const [key, fn] of Object.entries(GoogleDriveAPI.ipcHandlers)) {
            ipcMain.handle(key, fn)
        }
    }

    static operations = {
        listFiles: async () => {
            const drive = await GoogleDriveAPI.getDriveInstance()

            const res = await drive.files.list({
                pageSize: 10,
                fields: "nextPageToken, files(id, name)",
            })

            const files = res.data.files.map((file) => {
                return {
                    id: file.id,
                    name: file.name,
                }
            })

            return files
        },
        downloadFile: (file_id, dest_path, callback, progressCallback) => {
            return new Promise(async (resolve, reject) => {
                if (!file_id) {
                    throw new Error("No file_id provided")
                }

                if (!dest_path) {
                    throw new Error("No destination path provided")
                }

                const drive = await GoogleDriveAPI.getDriveInstance()

                const { data: metadata } = await drive.files.get({
                    fileId: file_id,
                })

                if (!metadata) {
                    throw new Error("Cannot retrieve file metadata")
                }

                let progress = progressHandler({
                    length: metadata.size,
                    time: 500,
                })

                const dest_stream = fs.createWriteStream(dest_path)

                drive.files.get({
                    fileId: file_id,
                    alt: "media",
                }, {
                    responseType: "stream",
                }, (err, { data }) => {
                    if (err) {
                        return reject(err)
                    }

                    data
                        .on("error", (err) => {
                            if (typeof callback === "function") {
                                callback(err)
                            }

                            reject(err)
                        })
                        .pipe(progress).pipe(dest_stream)
                })

                progress.on("progress", (progress) => {
                    if (typeof progressCallback === "function") {
                        progressCallback(progress)
                    }
                })

                dest_stream.on("finish", () => {
                    if (typeof callback === "function") {
                        callback()
                    }

                    resolve()
                })
            })
        }
    }

    static ipcHandlers = {
        "drive:listFiles": GoogleDriveAPI.operations.listFiles,
        "drive:authorize": GoogleDriveAPI.authorize,
        "drive:unauthorize": GoogleDriveAPI.unauthorize,
    }
}