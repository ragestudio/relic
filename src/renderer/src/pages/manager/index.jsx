import React from "react"
import * as antd from "antd"

import { MdAdd } from "react-icons/md"

import { Context as InstallationsContext, WithContext } from "contexts/installations"

import PackageItem from "components/PackageItem"
import NewInstallation from "components/NewInstallation"

import "./index.less"

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
        const { packages } = this.context

        const empty = packages.length == 0

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
                    empty && <antd.Empty description="No packages installed" />
                }

                {
                    packages.map((manifest) => {
                        return <PackageItem key={manifest.id} manifest={manifest} />
                    })
                }
            </div>

            <antd.Drawer
                title="Add new installation"
                placement="bottom"
                open={this.state.drawerVisible}
                height={"200px"}
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