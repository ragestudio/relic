import React from "react"
import * as antd from "antd"
import { Icon } from "components/Icons"

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

const PKGConfigItem = (props) => {
    const { config, storagedValue } = props

    const key = config.id

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
}

export default PKGConfigItem