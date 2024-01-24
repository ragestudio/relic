import React from "react"
import * as antd from "antd"
import { Icon } from "components/Icons"

import "./index.less"

const PKGConfigsComponents = {
    switch: antd.Switch,
    button: antd.Button,
    input: antd.Input,
    slider: antd.Slider,
}

const PKGConfigsComponentByTypes = {
    string: "input",
    action: "button",
    bool: "switch",
    number: "slider",
}

const PKGConfigs = (props) => {
    const { defaultConfigs = {}, configs = {} } = props

    if (Object.keys(defaultConfigs).length === 0) {
        return <p>
            No configuration available
        </p>
    }

    console.log(defaultConfigs, configs)

    return Object.keys(defaultConfigs).map((key, index) => {
        const config = defaultConfigs[key]
        const storagedValue = configs[key]

        const ComponentType = config.ui_component ?? PKGConfigsComponentByTypes[config.type] ?? "input"
        const ConfigComponent = PKGConfigsComponents[ComponentType]

        if (ConfigComponent == null) {
            return null
        }

        const ComponentsProps = {
            ...config.ui_component_props,
            defaultValue: storagedValue ?? config.default,
        }

        switch (ComponentType) {
            case "input": {
                ComponentsProps.onChange = (e) => {
                    props.onChange(key, e.target.value)
                }
                break
            }

            case "slider": {
                ComponentsProps.onChange = (value) => {
                    props.onChange(key, value)
                }
                break
            }

            case "switch": {
                ComponentsProps.onChange = (checked) => {
                    props.onChange(key, checked)
                }
                break
            }

            default: {
                ComponentsProps.onChange = (value) => {
                    props.onChange(key, value)
                }
                break;
            }
        }

        return <div
            key={index}
            id={key}
            className="package_configs-option"
        >
            <div className="package_configs-option-header">
                <span className="package_configs-option-label">
                    {
                        config.icon && <Icon
                            icon={config.icon}
                        />
                    }
                    {
                        config.label ?? key
                    }
                </span>

                {
                    config.description && <p className="package_configs-option-description">
                        {key}
                    </p>
                }
            </div>

            <div className="package_configs-option-content">
                {
                    React.createElement(ConfigComponent, ComponentsProps)
                }
            </div>
        </div>
    })
}

const PKGPatches = (props) => {
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

    if (!Array.isArray(manifest.applied_patches)) {
        manifest.applied_patches = Array()
    }

    const [changes, setChanges] = React.useState({
        configs: {},
        patches: manifest.patches ? Object.fromEntries(manifest.patches.map((p) => {
            return [p.id, manifest.applied_patches.includes(p.id)]
        })) : null
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

    function canApplyChanges() {
        return Object.keys(changes).length > 0
    }

    return <div className="package_options">
        {
            manifest.configs && <div className="package_options-field">
                <div className="package_options-field-header">
                    <p>
                        <Icon
                            icon="MdSettingsSuggest"
                        /> Configuration
                    </p>
                </div>

                <div className="package_options-field-body">
                    <PKGConfigs
                        defaultConfigs={manifest.configs}
                        configs={manifest.storaged_configs}
                        onChange={(key, value) => {
                            handleChanges("configs", key, value)
                        }}
                    />
                </div>
            </div>
        }

        {
            manifest.patches && <div className="package_options-field">
                <div className="package_options-field-header">
                    <p>Patches</p>
                </div>

                <div className="package_options-field-body">
                    <PKGPatches
                        patches={manifest.patches}
                        applied_patches={manifest.applied_patches}
                        onChange={(key, value) => {
                            handleChanges("patches", key, value)
                        }}
                    />
                </div>
            </div>
        }

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
                disabled={!canApplyChanges()}
            >
                Apply
            </antd.Button>
        </div>
    </div>
}

export default PackageOptions