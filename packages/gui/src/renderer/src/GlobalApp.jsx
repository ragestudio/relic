import { notification, message, Modal } from "antd"

import ManifestInfo from "components/ManifestInfo"
import PackageUpdateAvailable from "components/PackageUpdateAvailable"
import InstallConfigAsk from "components/InstallConfigAsk"

import getRootCssVar from "utils/getRootCssVar"

globalThis.getRootCssVar = getRootCssVar
globalThis.notification = notification
globalThis.message = message

export default class GlobalCTXApp {
    static applyUpdate = () => {
        message.loading("Updating, please wait...")

        ipc.exec("updater:apply")
    }

    static invokeInstall = (manifest) => {
        console.log(`installation invoked >`, manifest)

        app.drawer.open(ManifestInfo, {
            title: "New installation",
            props: {
                manifest: manifest,
            }
        })
    }

    static pkgUpdateAvailable = (update_data) => {
        app.drawer.open(PackageUpdateAvailable, {
            title: "Update Available",
            props: {
                update: update_data,
            }
        })
    }

    static pkgInstallWizard = (manifest) => {
        app.drawer.open(InstallConfigAsk, {
            title: "Configure installation",
            props: {
                manifest: manifest,
            }
        })
    }

    static appUpdateAvailable = (update_data) => {
        Modal.confirm({
            title: "Update Available",
            content: <>
                <p>
                    A new version of the application is available.
                </p>
            </>,
            okText: "Update",
            cancelText: "Later",
            onOk: () => {
                app.applyUpdate()
            }
        })
    }

    static checkUpdates = () => {
        ipc.exec("updater:check")
    }
}