import React from "react"
import * as antd from "antd"
import classnames from "classnames"

import BarLoader from "react-spinners/BarLoader"

import { MdAdd, MdUploadFile, MdFolder, MdDelete, MdPlayArrow, MdUpdate } from "react-icons/md"

import { Context as InstallationsContext, WithContext } from "contexts/installations"

import "./index.less"

const NewInstallation = (props) => {
    const [manifestUrl, setManifestUrl] = React.useState("")

    const handleInstall = (manifest) => {
        ipc.exec("bundle:install", manifest)
            .then(() => {
                props.close()
            })
            .catch((error) => {
                antd.message.error(error)
            })
    }

    return <div className="new_installation_prompt">
        <antd.Input
            placeholder="Manifest URL"
            value={manifestUrl}
            onChange={(e) => setManifestUrl(e.target.value)}
            onPressEnter={() => handleInstall(manifestUrl)}
        />

        <h2>
            or
        </h2>

        <antd.Button
            icon={<MdUploadFile />}
            disabled
        >
            Local file
        </antd.Button>
    </div>
}

const InstallationItem = (props) => {
    const { manifest } = props

    const isLoading = manifest.status === "installing" || manifest.status === "uninstalling" || manifest.status === "updating"
    const isInstalled = manifest.status === "installed"
    const isFailed = manifest.status === "failed"

    const onClickUpdate = () => {
        ipc.exec("bundle:update", manifest.id)
    }

    const onClickPlay = () => {
        ipc.exec("bundle:exec", manifest.id)
    }

    const onClickFolder = () => {
        ipc.exec("bundle:open", manifest.id)
    }

    const onClickDelete = () => {
        ipc.exec("bundle:uninstall", manifest.id)
    }

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
                        isLoading ? manifest.status : `v${manifest.version}` ?? "N/A"
                    }
                </p>
            </div>

            <div className="installation_item_actions">
                {
                    isInstalled && manifest.executable && <antd.Button
                        type="primary"
                        icon={<MdPlayArrow />}
                        onClick={onClickPlay}
                    />
                }

                {
                    isFailed && <antd.Button
                        type="primary"
                    >
                        Retry
                    </antd.Button>
                }

                {
                    isInstalled && <antd.Button
                        type="primary"
                        icon={<MdUpdate />}
                        onClick={onClickUpdate}
                    />
                }

                {
                    isInstalled && <antd.Button
                        type="primary"
                        icon={<MdFolder />}
                        onClick={onClickFolder}
                    />
                }

                {
                    isInstalled && <antd.Popconfirm
                        title="Delete Installation"
                        onConfirm={onClickDelete}
                    >
                        <antd.Button
                            type="ghost"
                            icon={<MdDelete />}
                        />
                    </antd.Popconfirm>
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

class InstallationsManager extends React.Component {
    static contextType = InstallationsContext

    state = {
        drawerVisible: false,
    }

    toggleDrawer = (to) => {
        this.setState({
            drawerVisible: to ?? !this.state.drawerVisible,
        })
    }

    render() {
        const { installations } = this.context

        const empty = installations.length == 0

        return <div className="installations_manager">
            <antd.Button
                type="primary"
                icon={<MdAdd />}
                onClick={() => this.toggleDrawer(true)}
            >
                Add new installation
            </antd.Button>

            <div className={empty ? "installations_list empty" : "installations_list"}>
                {
                    empty && <antd.Empty description="No installations" />
                }

                {
                    installations.map((manifest) => {
                        return <InstallationItem key={manifest.id} manifest={manifest} />
                    })
                }
            </div>

            <antd.Drawer
                title="Add new installation"
                placement="bottom"
                open={this.state.drawerVisible}
                onClose={() => this.toggleDrawer(false)}
            >
                <NewInstallation
                    close={() => this.toggleDrawer(false)}
                />
            </antd.Drawer>
        </div>
    }
}

const InstallationsManagerPage = (props) => {
    return <WithContext>
        <InstallationsManager {...props} />
    </WithContext>
}

export default InstallationsManagerPage