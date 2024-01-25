import React from "react"
import { Button } from "antd"

import "./index.less"

const PackageUpdateAvailable = ({ update, close }) => {
    function handleUpdate() {
        ipc.exec("pkg:update", update.manifest.id)

        close()
    }

    function handleContinue() {
        ipc.exec("pkg:execute", update.manifest.id, {
            force: true
        })

        close()
    }

    return <div className="package-update-available">
        <h1>New update available</h1>

        <p>This package is ready to be updated.</p>

        <code>
            <p>
                <b>{update.current_version}</b> -> <b>{update.new_version}</b>
            </p>
        </code>

        <div className="package-update-available_actions">
            <Button
                onClick={handleContinue}
            >
                Continue
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