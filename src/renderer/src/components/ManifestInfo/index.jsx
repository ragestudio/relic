import React from "react"
import * as antd from "antd"
import { MdDownloadForOffline, MdAccountCircle, MdTag } from "react-icons/md"

import "./index.less"

const ManifestInfo = (props) => {
    const [loading, setLoading] = React.useState(true)
    const [manifest, setManifest] = React.useState(null)
    const [error, setError] = React.useState(null)

    async function handleInstall() {
        await ipc.exec("bundle:install", props.manifest)

        if (typeof props.close === "function") {
            props.close()
        }
    }

    async function loadManifest(url) {
        setLoading(true)

        try {
            const result = await ipc.exec("bundle:read", url)

            setManifest(JSON.parse(result))

            setLoading(false)
        } catch (error) {
            setError(error)
        }
    }

    React.useEffect(() => {
        if (typeof props.manifest === "string") {
            loadManifest(props.manifest)
        } else {
            setLoading(false)
        }
    }, [])

    if (error) {
        return <antd.Result status="error" title={error.message} />
    }

    if (loading) {
        return <antd.Skeleton active />
    }

    return <div className="manifest_info">
        <div className="manifest_info-header">
            <div
                className="manifest_info-icon"
            >
                <img
                    src={manifest.icon}
                />
            </div>

            <h1>
                {manifest.pack_name}
            </h1>
        </div>

        <div className="manifest_info-description">
            <p>
                {manifest.description}
            </p>
        </div>

        <div className="manifest_info-extra_info">
            <div className="manifest_info-extra_info-item">
                <MdDownloadForOffline />
                0 MB
            </div>

            <div className="manifest_info-extra_info-item">
                <MdAccountCircle />
                {manifest.author}
            </div>

            <div className="manifest_info-extra_info-item">
                <MdTag />
                v{manifest.version}
            </div>
        </div>

        <div className="manifest_info-actions">
            <antd.Button
                type="primary"
                onClick={handleInstall}
            >
                Install
            </antd.Button>
        </div>
    </div>
}

export default ManifestInfo