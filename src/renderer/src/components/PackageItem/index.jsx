import React from "react"
import * as antd from "antd"
import classnames from "classnames"

import BarLoader from "react-spinners/BarLoader"

import { MdFolder, MdDelete, MdPlayArrow, MdUpdate, MdOutlineMoreVert, MdSettings, MdInfoOutline } from "react-icons/md"

import "./index.less"

const PackageItem = (props) => {
    const [manifest, setManifest] = React.useState(props.manifest)

    const isLoading = manifest.status === "installing" || manifest.status === "uninstalling" || manifest.status === "updating"
    const isInstalled = manifest.status === "installed"
    const isFailed = manifest.status === "failed"

    const onClickUpdate = () => {
        antd.Modal.confirm({
            title: "Update",
            content: `Are you sure you want to update ${manifest.id}?`,
            onOk: () => {
                ipc.exec("bundle:update", manifest.id)
            },
        })
    }

    const onClickPlay = () => {
        ipc.exec("bundle:exec", manifest.id)
    }

    const onClickFolder = () => {
        ipc.exec("bundle:open", manifest.id)
    }

    const onClickDelete = () => {
        antd.Modal.confirm({
            title: "Uninstall",
            content: `Are you sure you want to uninstall ${manifest.id}?`,
            onOk: () => {
                ipc.exec("bundle:uninstall", manifest.id)
            },
        })
    }

    function handleUpdate(event, data) {
        setManifest({
            ...manifest,
            ...data,
        })
    }

    function renderStatusLine(manifest) {
        if (isLoading) {
            return manifest.status
        }

        return `v${manifest.version}` ?? "N/A"
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
                disabled: true
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
        ipc.on(`installation:${manifest.id}:status`, handleUpdate)

        return () => {
            ipc.off(`installation:${manifest.id}:status`, handleUpdate)
        }
    }, [])

    React.useEffect(() => {
        setManifest(props.manifest)
    }, [props.manifest])

    return <div
        className={classnames(
            "installation_item_wrapper",
            {
                ["status_visible"]: !isInstalled
            }
        )}
    >
        <div className="installation_item">
            <img src={manifest.icon} className="installation_item_icon" />

            <div className="installation_item_info">
                <h2>
                    {
                        manifest.pack_name
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
                    isFailed && <antd.Button
                        type="primary"
                    >
                        Retry
                    </antd.Button>
                }

                {
                    isInstalled && manifest.executable && <antd.Dropdown.Button
                        menu={MenuProps}
                        onClick={onClickPlay}
                        type="primary"
                        trigger={["click"]}
                    >
                        <MdPlayArrow />
                    </antd.Dropdown.Button>
                }

                {
                    isInstalled && !manifest.executable && <antd.Dropdown
                        menu={MenuProps}
                    >
                        <antd.Button
                            icon={<MdOutlineMoreVert />}
                            type="primary"
                        />
                    </antd.Dropdown>
                }
            </div>
        </div>

        <div
            className="installation_status"
        >
            {
                isLoading && <BarLoader color={getRootCssVar("--primary-color")} className="app_loader" />
            }

            <p>{manifest.statusText ?? "Unknown status"}</p>
        </div>
    </div>
}

export default PackageItem