import React from "react"
import BarLoader from "react-spinners/BarLoader"

import GlobalStateContext from "contexts/global"

import InstallationsManager from "pages/manager"

export const PageRender = () => {
    const globalState = React.useContext(GlobalStateContext)

    if (globalState.initializing_text && globalState.loading) {
        return <div className="app_setup">
            <BarLoader
                className="app_loader"
                color={getRootCssVar("--primary-color")}
            />

            <h1>Setting up...</h1>

            <code>
                <pre>{globalState.initializing_text}</pre>
            </code>
        </div>
    }

    return <InstallationsManager />
}