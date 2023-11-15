import React from "react"
import * as antd from "antd"
import { MdFolder, MdSettings, MdDownload } from "react-icons/md"

import GlobalStateContext from "contexts/global"

import Icon from "../../../../assets/icon"

const Header = (props) => {
    const ctx = React.useContext(GlobalStateContext)

    return <antd.Layout.Header className="app_header">
        <div className="branding">
            <Icon />
        </div>

        {
            !ctx.loading && <div className="menu">
                {
                    ctx.updateAvailable && <antd.Button
                        size="small"
                        icon={<MdDownload />}
                        onClick={app.applyUpdate}
                    >
                        Update now
                    </antd.Button>
                }

                <antd.Button
                    size="small"
                    icon={<MdSettings />}
                />

                <antd.Button
                    size="small"
                    icon={<MdFolder />}
                    onClick={() => ipc.send("open-runtime-path")}
                />

                {
                    ctx.pkg && <antd.Tag>
                        v{ctx.pkg.version}
                    </antd.Tag>
                }
            </div>
        }
    </antd.Layout.Header>
}

export default Header