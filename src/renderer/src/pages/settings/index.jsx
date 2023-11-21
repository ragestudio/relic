import React from "react"
import * as antd from "antd"
import { Icons, Icon } from "components/Icons"

import "./index.less"

const settingsList = [
    {
        id: "drive_auth",
        name: "Google Drive Authorize",
        description: "Authorize your Google Drive account to be used for bundles installation.",
        icon: "SiGoogledrive",
        type: "button",
        value: async () => {
            return api.settings.get("drive_auth")
        },
        render: (props) => {
            return <antd.Button
                type="primary"
                onClick={() => {
                    if (!props.value) {
                        message.info("Authorizing...")
                        return ipc.exec("drive:authorize")
                    }

                    return api.settings.delete("drive_auth")
                }}
            >
                {
                    props.value ? "Deauthorize" : "Authorize"
                }
            </antd.Button>
        }
    },
    {
        id: "check_update",
        name: "Check for updates",
        description: "Check for updates to the app.",
        icon: "MdUpdate",
        type: "button",
        props: {
            children: "Check",
            onClick: () => {
                message.info("Checking for updates...")
                app.checkUpdates()
            }
        }
    }
]

const SettingTypeToComponent = {
    switch: antd.Switch,
    button: antd.Button,
}

const SettingItem = (props) => {
    const {
        id,
        name,
        description,
        type,
        icon,
        props: _props,
        render,
    } = props.setting

    const [loading, setLoading] = React.useState(false)
    const [value, setValue] = React.useState(null)

    React.useEffect(() => {
        if (typeof props.setting.value === "function") {
            setLoading(true)

            props.setting.value().then((value) => {
                setValue(value)
                setLoading(false)
            })
        } else {
            setLoading(false)
        }
    }, [props.setting.value])

    let componentProps = {
        value: value,
        ..._props,
    }

    async function handleChange(value) {
        console.log(`Setting [${id}] set to >`, value)
        setValue(value)
        api.settings.set(id, value)
    }

    switch (type) {
        case "switch": {
            componentProps.defaultChecked = defaultProps.defaultChecked ?? false
            componentProps.onChange = (e) => {
                handleChange(e)
            }
            break
        }
    }

    const Component = SettingTypeToComponent[type.toLowerCase()]
    const Render = () => {
        if (typeof render === "function") {
            return render(componentProps)
        }

        return React.createElement(Component, componentProps)
    }

    return <div
        className="app_settings-list-item"
    >
        <div className="app_settings-list-item-info">
            <div className="app_settings-list-item-label">
                <Icon icon={icon} />

                <h2>
                    {name}
                </h2>
            </div>

            <div className="app_settings-list-item-description">
                <p>
                    {description}
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

const Settings = () => {
    return <div className="app_settings">
        <div className="app_settings-header">
            <div className="app_settings-header-back">
                <Icons.MdChevronLeft
                    onClick={() => {
                        app.location.push("/")
                    }}
                />
                Back
            </div>

            <div className="app_settings-header-title">
                <Icons.MdSettings />
                <h1>Settings</h1>
            </div>
        </div>

        <div className="app_settings-list">
            {
                settingsList.map((setting, index) => {
                    return <SettingItem
                        key={index}
                        setting={setting}
                    />
                })
            }
        </div>

        <div className="software_info">

        </div>
    </div>
}

export default Settings