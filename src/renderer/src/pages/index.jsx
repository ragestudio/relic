import React from "react"
import * as antd from "antd"

import { MdAdd } from "react-icons/md"

import { Context as InstallationsContext, WithContext } from "contexts/installations"

import PackageItem from "components/PackageItem"
import NewInstallation from "components/NewInstallation"

import "./index.less"

class InstallationsManager extends React.Component {
    static contextType = InstallationsContext

    render() {
        const { packages } = this.context

        const empty = packages.length == 0

        return <div className="installations_manager">
            <div className="installations_manager-header">
                <antd.Button
                    type="primary"
                    icon={<MdAdd />}
                    onClick={() => app.drawer.open(NewInstallation, {
                        title: "Add new installation",
                        height: "200px",
                    })}
                >
                    Add new installation
                </antd.Button>

                <antd.Input.Search
                    variant="filled"
                    placeholder="Search"
                    onSearch={() => { }}
                    disabled
                />
            </div>

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
        </div>
    }
}

const InstallationsManagerPage = (props) => {
    return <WithContext>
        <InstallationsManager {...props} />
    </WithContext>
}

export default InstallationsManagerPage