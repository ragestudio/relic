import React from "react"
import * as antd from "antd"
import { Icons } from "components/Icons"

import PathsDecorators from "config/paths_decorators"

import GlobalStateContext from "contexts/global"

import Icon from "../../../../assets/icon"

import "./index.less"

const Header = (props) => {
    const ctx = React.useContext(GlobalStateContext)

    const [decorator, setDecorator] = React.useState({})
    const [navMode, setNavMode] = React.useState(false)

    function onChangeAppLocation(_path, state) {
        const isNavigable = _path !== "/"

        const decorator = PathsDecorators.find((route) => {
            const routePath = route.path.replace(/\*/g, ".*").replace(/!/g, "^")

            return new RegExp(routePath).test(_path)
        })

        document.startViewTransition(() => {
            setDecorator({})
            setNavMode(isNavigable)

            if (decorator) {
                setDecorator(decorator)
            }
        })
    }

    React.useEffect(() => {
        app.location.listen(onChangeAppLocation)

        return () => {
            app.location.unlisten(onChangeAppLocation)
        }
    }, [])

    return <div className="app_header_wrapper">
        <antd.Layout.Header className="app_header">
            {
                !navMode && <>
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
                                ctx.appUpdate?.available && <antd.Button
                                    size="small"
                                    icon={<Icons.MdDownload />}
                                    onClick={app.applyUpdate}
                                    type="primary"
                                >
                                    Update app
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

                            {
                                ctx.pkg && <antd.Tag>
                                    v{ctx.pkg.version}
                                </antd.Tag>
                            }
                        </div>
                    }
                </>
            }

            {
                navMode && <div className="app_header_nav">
                    <div className="app_header_nav_back">
                        <Icons.MdChevronLeft
                            onClick={() => {
                                app.location.back()
                            }}
                        />
                    </div>

                    <div
                        className="app_header_nav_title"
                    >
                        <h1>
                            {
                                decorator.label
                            }
                        </h1>
                    </div>
                </div>
            }

        </antd.Layout.Header>
    </div>
}

export default Header