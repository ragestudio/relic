import React from "react"
import * as antd from "antd"

import { MdAdd } from "react-icons/md"

import { Context as InstallationsContext, WithContext } from "contexts/packages"

import PackageItem from "components/PackageItem"
import NewInstallation from "components/NewInstallation"

import "./index.less"

class Packages extends React.Component {
    static contextType = InstallationsContext

    render() {
        const { packages, loading } = this.context

        const empty = packages.length == 0

        return <div className="packages">
            <div className="packages-header">
                <antd.Button
                    type="primary"
                    icon={<MdAdd />}
                    onClick={() => app.drawer.open(NewInstallation, {
                        title: "Install new package",
                        height: "200px",
                    })}
                    className="add-btn"
                >
                    Add new
                </antd.Button>

                <antd.Input.Search
                    variant="filled"
                    placeholder="Search"
                    onSearch={() => { }}
                    disabled
                />
            </div>

            <div className={empty ? "packages-list empty" : "packages-list"}>
                {
                    loading && <antd.Skeleton active round />
                }

                {
                    !loading && empty && <antd.Empty description="No packages installed" />
                }

                {
                    !loading && packages.map((manifest) => {
                        return <PackageItem key={manifest.id} manifest={manifest} />
                    })
                }
            </div>
        </div>
    }
}

const PackagesPage = (props) => {
    return <WithContext>
        <Packages {...props} />
    </WithContext>
}

export default PackagesPage