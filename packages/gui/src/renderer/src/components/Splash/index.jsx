import React from "react"
import * as antd from "antd"
import { BarLoader } from "react-spinners"
import GlobalStateContext from "contexts/global"

import "./index.less"

const Splash = (props) => {
    const globalState = React.useContext(GlobalStateContext)

    return <div className="splash">
        {
            !!globalState.appSetup.message && <div className="app-setup_header">
                <h1>
                    Setting up...
                </h1>
                <p>
                    Please wait while the application is being set up.
                </p>
            </div>
        }

        {
            globalState.appSetup.message && <>
                <div className="app-setup_message-wrapper">
                <div className="app-setup_message">
                    <span>
                        {globalState.appSetup.message}
                    </span>
                </div>
                </div>

                <BarLoader
                    className="app_loader"
                    color={getRootCssVar("--primary-color")}
                />
            </>
        }

        {
            !globalState.appSetup.message && <antd.Skeleton
                active
                round
            />
        }
    </div>
}

export default Splash