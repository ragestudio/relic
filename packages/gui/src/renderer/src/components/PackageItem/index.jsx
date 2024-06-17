import React from "react"
import * as antd from "antd"
import classnames from "classnames"

import BarLoader from "react-spinners/BarLoader"

import { MdCode, MdFolder, MdDelete, MdPlayArrow, MdUpdate, MdOutlineMoreVert, MdSettings, MdInfoOutline } from "react-icons/md"

import "./index.less"

const PackageItem = (props) => {
    const [manifest, setManifest] = React.useState(props.manifest)

    const isLoading = manifest.last_status === "loading" || manifest.last_status === "installing" || manifest.last_status === "updating"
    const isInstalling = manifest.last_status === "installing"
    const isInstalled = !!manifest.installed_at
    const isFailed = manifest.last_status === "failed"

    console.log(manifest, {
        isLoading,
        isInstalling,
        isInstalled,
        isFailed
    })

    const onClickUpdate = () => {
        antd.Modal.confirm({
            title: "Update",
            content: `Are you sure you want to update ${manifest.id}?`,
            onOk: () => {
                ipc.exec("pkg:update", manifest.id)
            },
        })
    }

    const onClickPlay = () => {
        ipc.exec("pkg:execute", manifest.id)
    }

    const onClickFolder = () => {
        ipc.exec("core:open-path", manifest.id)
    }

    const onClickDelete = () => {
        antd.Modal.confirm({
            title: "Uninstall",
            content: `Are you sure you want to uninstall ${manifest.id}?`,
            onOk: () => {
                ipc.exec("pkg:uninstall", manifest.id)
            },
        })
    }

    const onClickOptions = () => {
        app.location.push(`/pkg/${manifest.id}`)
    }

    const onClickCancelInstall = () => {
        antd.Modal.confirm({
            title: "Uninstall",
            content: `Are you sure you want to cancel the installation? The package will not be installed and all data will be lost.`,
            onOk: () => {
                ipc.exec("pkg:cancel_install", manifest.id)
            },
        })
    }

    const onClickRetryInstall = () => {
        ipc.exec("pkg:last_operation_retry", manifest.id)
    }

    function handleUpdate(event, data) {
        setManifest({
            ...manifest,
            ...data,
        })
    }

    function renderStatusLine(manifest) {
        if (isLoading) {
            return manifest.last_status
        }

        return `${isFailed ? "failed |" : ""} v${manifest.version}` ?? "N/A"
    }

    const MenuProps = {
        items: [
            {
                key: "open_folder",
                label: "Open Folder",
                icon: <MdFolder />,
                onClick: onClickFolder,
            },
            {
                key: "update",
                label: "Update",
                icon: <MdUpdate />,
                onClick: onClickUpdate,
            },
            {
                key: "options",
                label: "Options",
                icon: <MdSettings />,
                onClick: onClickOptions,
            },
            {
                type: "divider"
            },
            {
                key: "info",
                label: "Info",
                icon: <MdInfoOutline />,
                disabled: true
            },
            {
                key: "delete",
                label: "Uninstall",
                icon: <MdDelete />,
                onClick: onClickDelete,
                danger: true,
            },
        ],
    }

    React.useEffect(() => {
        ipc.on(`pkg:update:state:${manifest.id}`, handleUpdate)

        return () => {
            ipc.off(`pkg:update:state:${manifest.id}`, handleUpdate)
        }
    }, [])

    React.useEffect(() => {
        setManifest(props.manifest)
    }, [props.manifest])

    return <div
        className={classnames(
            "installation_item_wrapper",
            {
                ["status_visible"]: isLoading,
                ["loading"]: isLoading,
                ["installing"]: isInstalling,
            }
        )}
    >
        <div className="installation_item">
            {
                !manifest.icon && <MdCode className="installation_item_icon" />
            }

            {
                manifest.icon && <img src={manifest.icon} className="installation_item_icon" />
            }

            <div className="installation_item_info">
                <h2>
                    {
                        manifest.name ?? manifest.pack_name
                    }
                </h2>
                <p>
                    {
                        renderStatusLine(manifest)
                    }
                </p>
            </div>

            <div className="installation_item_actions">
                {
                    isInstalling && <antd.Button
                        type="primary"
                        onClick={onClickCancelInstall}
                    >
                        Cancel
                    </antd.Button>
                }

                {
                    isFailed && <>
                        <antd.Button
                            type="primary"
                            onClick={onClickRetryInstall}
                        >
                            Retry
                        </antd.Button>

                        <antd.Button
                            icon={<MdDelete />}
                            type="primary"
                            onClick={onClickDelete}
                        />
                    </>
                }

                {
                    !isFailed && isInstalled && manifest.executable && <antd.Dropdown.Button
                        menu={MenuProps}
                        onClick={onClickPlay}
                        type="primary"
                        trigger={["click"]}
                    >
                        <MdPlayArrow
                            disabled={isLoading}
                        />
                    </antd.Dropdown.Button>
                }

                {
                    isFailed && isInstalled && !manifest.executable && <antd.Dropdown
                        menu={MenuProps}
                        disabled={isLoading}
                    >
                        <antd.Button
                            icon={<MdOutlineMoreVert />}
                            type="primary"
                            disabled={isLoading}
                        />
                    </antd.Dropdown>
                }

                {
                    isFailed && isInstalling && <antd.Button
                        type="primary"
                        onClick={onClickCancelInstall}
                    >
                        Cancel
                    </antd.Button>
                }
            </div>
        </div>

        <div
            className="installation_status"
        >
            {
                isLoading && <BarLoader color={getRootCssVar("--primary-color")} className="app_loader" />
            }

            {
                manifest.status_text && <p>{manifest.status_text}</p>
            }
        </div>
    </div>
}

export default PackageItem