import React from "react"
import BarLoader from "react-spinners/BarLoader"
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom"

import GlobalStateContext from "contexts/global"

import PackagesMangerPage from "pages/manager"
import SettingsPage from "pages/settings"

const NavigationController = (props) => {
    if (!app.location) {
        app.location = Object()
    }

    const navigate = useNavigate()

    async function setLocation(to, state = {}) {
        // clean double slashes
        to = to.replace(/\/{2,}/g, "/")

        // if state is a number, it's a delay
        if (typeof state !== "object") {
            state = {}
        }

        app.location.last = window.location

        return navigate(to, {
            state
        })
    }

    async function backLocation() {
        app.location.last = window.location

        if (transitionDuration >= 100) {
            await new Promise((resolve) => setTimeout(resolve, transitionDuration))
        }

        return window.history.back()
    }

    React.useEffect(() => {
        app.location = {
            last: window.location,
            push: setLocation,
            back: backLocation,
        }
    }, [])

    return props.children
}

export const InternalRouter = (props) => {
    return <BrowserRouter>
        <NavigationController>
            {props.children}
        </NavigationController>
    </BrowserRouter>
}

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

    return <Routes>
        <Route path="/" element={<PackagesMangerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
    </Routes>
}