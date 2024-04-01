import React from "react"
import * as antd from "antd"
import { Icon } from "components/Icons"

import settingsList from "@renderer/settings_list"

import "./index.less"

const SettingTypeToComponent = {
    switch: antd.Switch,
    button: antd.Button,
}

const SettingItem = (props) => {
    const { setting } = props

    const [loading, setLoading] = React.useState(false)
    const [value, setValue] = React.useState(null)

    async function handleChange(value) {
        console.log(`Setting [${setting.id}] set to >`, value)

        setValue(value)

        if (setting.storaged) {
            api.settings.set(setting.id, value)
        }
    }

    async function fetchDefaultValue() {
        if (typeof setting.defaultValue !== "undefined") {
            if (typeof setting.defaultValue === "function") {
                setLoading(true)

                const value = await setting.defaultValue()

                setValue(value)
                setLoading(false)
            } else {
                setValue(setting.defaultValue)
                setLoading(false)
            }
        }
    }

    React.useEffect(() => {
        fetchDefaultValue()

        if (setting.watchIpc) {
            for (const watchIpc of setting.watchIpc) {
                ipc.on(watchIpc, (event, value) => {
                    fetchDefaultValue()
                })
            }
        }

        return () => {
            if (setting.watchIpc) {
                for (const watchIpc of setting.watchIpc) {
                    ipc.off(watchIpc, (event, value) => {
                        fetchDefaultValue()
                    })
                }
            }
        }
    }, [])

    let componentProps = {
        value: value,
        handleChange: handleChange,
        ...setting.props,
    }

    switch (setting.type) {
        case "switch": {
            componentProps.defaultChecked = !!value
            componentProps.onChange = (e) => {
                handleChange(e)
            }
            break
        }
    }

    const Component = SettingTypeToComponent[setting.type.toLowerCase()]

    const Render = () => {
        if (typeof setting.render === "function") {
            return setting.render(componentProps)
        }

        return React.createElement(Component, componentProps)
    }

    return <div
        className="app_settings-list-item"
    >
        <div className="app_settings-list-item-info">
            <div className="app_settings-list-item-label">
                <Icon icon={setting.icon} />

                <h2>
                    {setting.name}
                </h2>
            </div>

            <div className="app_settings-list-item-description">
                <p>
                    {setting.description}
                </p>
            </div>
        </div>

        <div className="app_settings-list-item-component">
            {
                loading && <antd.Spin />
            }
            {
                !loading && <Render />
            }
        </div>
    </div>
}

const SettingsList = ({ settings }) => {
    return settings.map((setting, index) => {
        const isGroup = Array.isArray(setting.children)

        if (isGroup) {
            return <div
                id={setting.id}
                className="app_settings-list-group"
            >
                <div className="app_settings-list-group_label">
                    {
                        setting.icon && <Icon icon={setting.icon} />
                    }
                    <h1>
                        {setting.name}
                    </h1>
                </div>

                <SettingsList
                    settings={setting.children}
                />
            </div>
        }

        return <SettingItem
            key={index}
            setting={setting}
        />
    })
}

const Settings = () => {
    return <div className="app_settings">
        <div className="app_settings-list">
            <SettingsList
                settings={settingsList}
            />
        </div>
    </div>
}

export default Settings