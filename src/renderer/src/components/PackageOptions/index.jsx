import React from "react"
import * as antd from "antd"

import "./index.less"

const Options = (props) => {
    const { options = {} } = props

    if (Object.keys(options).length === 0) {
        return <p>
            No options available
        </p>
    }

    return Object.keys(options).map((key, index) => {
        return <div
            key={index}
            id={key}
            className="package_options-option"
        >
            <antd.Switch
                defaultChecked={options[key]}
                onChange={(e) => {
                    props.onChange(key, e)
                }}
            />

            <span>
                {key}
            </span>
        </div>
    })
}

const Patches = (props) => {
    const { patches = [], applied_patches = [] } = props

    if (patches.length === 0) {
        return <p>
            No patches available
        </p>
    }

    return patches.map((patch, index) => {
        const isInstalled = applied_patches.includes(patch.id)

        return <div
            key={index}
            id={patch.id}
        >
            <antd.Checkbox
                defaultChecked={isInstalled}
                onChange={(e) => {
                    props.onChange(patch.id, e.target.checked)
                }}
            >
                {patch.name}
            </antd.Checkbox>
        </div>
    })
}

const PackageOptions = (props) => {
    const { manifest } = props

    const [changes, setChanges] = React.useState({
        options: manifest.options ?? {},
        patches: Object.fromEntries(manifest.patches.map((p) => {
            return [p.id, manifest.applied_patches.includes(p.id)]
        }))
    })

    function applyChanges() {
        if (props.onClose) {
            props.onClose()
        }
        if (props.close) {
            props.close()
        }

        ipc.exec("pkg:apply_changes", manifest.id, changes)
    }

    function handleChanges(field, key, value) {
        setChanges((prev) => {
            return {
                ...prev,
                [field]: {
                    ...prev[field],
                    [key]: value
                }
            }
        })
    }

    return <div className="package_options">
        <div className="package_options-field">
            <div className="package_options-field-header">
                <p>Options</p>
            </div>

            <div className="package_options-field-body">
                <Options
                    options={manifest.options}
                    onChange={(key, value) => {
                        handleChanges("options", key, value)
                    }}
                />
            </div>
        </div>

        <div className="package_options-field">
            <div className="package_options-field-header">
                <p>Patches</p>
            </div>

            <div className="package_options-field-body">
                <Patches
                    patches={manifest.patches}
                    applied_patches={manifest.applied_patches}
                    onChange={(key, value) => {
                        handleChanges("patches", key, value)
                    }}
                />
            </div>
        </div>

        <div className="package_options-info">
            <div className="package_options-info-item">
                <div className="package_options-info-item-label">
                    Package ID
                </div>

                <div className="package_options-info-item-value">
                    <span>
                        {manifest.id}
                    </span>
                </div>
            </div>

            <div className="package_options-info-item">
                <div className="package_options-info-item-label">
                    Disk Usage
                </div>

                <div className="package_options-info-item-value">
                    <span>
                        {manifest.disk_usage ?? "unknown"}
                    </span>
                </div>
            </div>

            <div className="package_options-info-item">
                <div className="package_options-info-item-label">
                    Install path
                </div>

                <div className="package_options-info-item-value">
                    <span>
                        {manifest.install_path ?? "unknown"}
                    </span>
                </div>
            </div>

            <div className="package_options-info-item">
                <div className="package_options-info-item-label">
                    Manifest URL
                </div>

                <div className="package_options-info-item-value">
                    <p>
                        {manifest.remote_url ?? "unknown"}
                    </p>
                </div>
            </div>

            <div className="package_options-info-item">
                <div className="package_options-info-item-label">
                    Version
                </div>

                <div className="package_options-info-item-value">
                    <p>
                        {manifest.version ?? "unknown"}
                    </p>
                </div>
            </div>
        </div>

        <div className="package_options-actions">
            <antd.Button
                type="primary"
                onClick={applyChanges}
            >
                Apply
            </antd.Button>
        </div>
    </div>
}

export default PackageOptions