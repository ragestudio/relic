import { notification, message, Modal } from "antd"

import ManifestInfo from "components/ManifestInfo"
import PackageUpdateAvailable from "components/PackageUpdateAvailable"
import InstallConfigAsk from "components/InstallConfigAsk"

import getRootCssVar from "utils/getRootCssVar"

globalThis.getRootCssVar = getRootCssVar
globalThis.notification = notification
globalThis.message = message

class GlobalStyleController {
    static root = document.getElementById("root")

    static appendClassname = (classname) => {
        console.log(`appending classname >`, classname)
        GlobalStyleController.root.classList.add(classname)
    }

    static removeClassname = (classname) => {
        console.log(`removing classname >`, classname)
        GlobalStyleController.root.classList.remove(classname)
    }

    static getRootCssVar = getRootCssVar
}

export default class GlobalCTXApp {
    static style = GlobalStyleController

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

    static applyUpdate = () => {
        message.loading("Updating, please wait...")

        ipc.exec("updater:apply")
    }

    static checkUpdates = () => {
        ipc.exec("updater:check")
    }
}