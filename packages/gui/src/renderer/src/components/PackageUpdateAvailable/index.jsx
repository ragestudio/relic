import React from "react"
import { Button } from "antd"
import { Icons } from "components/Icons"

import "./index.less"

const PackageUpdateAvailable = ({ update, close }) => {
    if (!update) {
        setTimeout(() => {
            close()
        }, 1000)

        return <h1>
            Nothing to update
        </h1>
    }

    function handleUpdate() {
        ipc.exec("pkg:update", update.manifest.id, {
            execOnFinish: true
        })

        close()
    }

    function handleContinue() {
        ipc.exec("pkg:execute", update.manifest.id, {
            force: true
        })

        close()
    }

    return <div className="package-update-available">
        <h1><Icons.MdUpcoming /> New update available</h1>

        <p>This package is ready to be updated. <br />Do you want to update this package or run the current local version?</p>

        <code>
            <p>
                <b>{update.current_version}</b> {`->`} <b>{update.new_version}</b>
            </p>
        </code>

        <div className="package-update-available_actions">
            <Button
                onClick={handleContinue}
            >
                Cancel
            </Button>

            <Button
                onClick={handleContinue}
            >
                Ignore
            </Button>

            <Button
                type="primary"
                onClick={handleUpdate}
            >
                Update
            </Button>
        </div>
    </div>
}

export default PackageUpdateAvailable