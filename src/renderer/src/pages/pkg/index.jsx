import React from "react"
import * as antd from "antd"
import { Icons, Icon } from "components/Icons"
import { useParams } from "react-router-dom"

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

    return Object.keys(defaultConfigs).map((key, index) => {
        const config = defaultConfigs[key]
        const storagedValue = configs[key]

        const [localValue, setLocalValue] = React.useState(storagedValue ?? config.default)

        const ComponentType = config.ui_component ?? PKGConfigsComponentByTypes[config.type] ?? "input"
        const ConfigComponent = PKGConfigsComponents[ComponentType]

        function handleOnChange(value) {
            if (typeof value === "string" && config.string_trim === true) {
                value = value.trim()
            }

            setLocalValue(value)

            return props.onChange(key, value)
        }

        if (ConfigComponent == null) {
            return null
        }

        const ComponentsProps = {
            ...config.ui_component_props,
            defaultValue: storagedValue ?? config.default,
            value: localValue
        }

        switch (ComponentType) {
            case "input": {
                ComponentsProps.onChange = (e) => {
                    handleOnChange(e.target.value)
                }
                break
            }

            case "slider": {
                ComponentsProps.onChange = (value) => {
                    handleOnChange(value)
                }
                break
            }

            case "switch": {
                ComponentsProps.onChange = (checked) => {
                    handleOnChange(checked)
                }
                break
            }

            default: {
                ComponentsProps.onChange = (value) => {
                    handleOnChange(value)
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

        ipc.exec("pkg:apply", manifest.id, changes)
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

    function handleReinstall() {
        antd.Modal.confirm({
            title: "Reinstall",
            content: "Are you sure you want to reinstall this package? Some data can be lost.",
            onOk() {
                const closeModal = props.onClose || props.close

                if (closeModal) {
                    closeModal()
                } else {
                    app.location.push("/")
                }

                ipc.exec("pkg:install", manifest)
            },
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
            manifest.patches && manifest.patches.length > 0 && <div className="package_options-field">
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
                onClick={handleReinstall}
                icon={<Icons.MdReplay />}
                type="default"
            >
                Reinstall
            </antd.Button>

            <antd.Button
                disabled
                icon={<Icons.MdCheck />}
                type="default"
            >
                Verify
            </antd.Button>

            <antd.Button
                type="primary"
                onClick={applyChanges}
                disabled={!canApplyChanges()}
            >
                Apply Changes
            </antd.Button>
        </div>
    </div>
}

const PackageOptionsLoader = (props) => {
    const { pkg_id } = useParams()
    const [manifest, setManifest] = React.useState(null)

    React.useEffect(() => {
        ipc.exec("pkg:get", pkg_id).then((manifest) => {
            console.log(manifest)
            setManifest(manifest)
        })
    }, [pkg_id])

    if (!manifest) {
        return <antd.Skeleton active />
    }

    return <div className="package_options-wrapper">
        <div className="package_options-wrapper-header">
            <div className="package_options-wrapper-header-back">
                <Icons.MdChevronLeft
                    onClick={() => {
                        app.location.push("/")
                    }}
                />
                Back
            </div>
        </div>

        <PackageOptions
            manifest={manifest}
            {...props}
        />
    </div>
}

export default PackageOptionsLoader