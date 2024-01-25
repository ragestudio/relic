import React from "react"
import * as antd from "antd"
import { Icons } from "components/Icons"

import GlobalStateContext from "contexts/global"

import Icon from "../../../../assets/icon"

const Header = (props) => {
    const ctx = React.useContext(GlobalStateContext)

    return <antd.Layout.Header className="app_header">
        <div className="branding" onClick={() => app.location.push("/")}>
            <Icon />
        </div>

        {
            !ctx.loading && <div className="menu">
                {
                    ctx.authorizedServices?.drive && <Icons.SiGoogledrive
                        style={{
                            color: `var(--primary-color)`,
                        }}
                    />
                }

                {
                    ctx.updateAvailable && <antd.Button
                        size="small"
                        icon={<Icons.MdDownload />}
                        onClick={app.applyUpdate}
                        type="primary"
                    >
                        Update now
                    </antd.Button>
                }

                <antd.Button
                    size="small"
                    icon={<Icons.MdHome />}
                    onClick={() => app.location.push("/")}
                />

                <antd.Button
                    size="small"
                    icon={<Icons.MdSettings />}
                    onClick={() => app.location.push("/settings")}
                />

                <antd.Button
                    size="small"
                    icon={<Icons.MdFolder />}
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