import React from "react"
import * as antd from "antd"

import "./index.less"

const NewInstallation = (props) => {
    const [manifestUrl, setManifestUrl] = React.useState("")

    function handleClickInstall() {
        app.invokeInstall(manifestUrl)
    }

    return <div className="new_installation_prompt">
        <antd.Input
            placeholder="Manifest URL"
            value={manifestUrl}
            onChange={(e) => {
                setManifestUrl(e.target.value)
            }}
            onPressEnter={handleClickInstall}
        />

        <antd.Button
            type="primary"
            onClick={handleClickInstall}
        >
            Install
        </antd.Button>
    </div>
}

export default NewInstallation