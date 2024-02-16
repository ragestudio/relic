import React from "react"
import BarLoader from "react-spinners/BarLoader"
import { Skeleton } from "antd"

import { HashRouter, Route, Routes, useNavigate, useParams } from "react-router-dom"
import loadable from "@loadable/component"

import GlobalStateContext from "contexts/global"

const DefaultNotFoundRender = () => {
    return <div>Not found</div>
}

const DefaultLoadingRender = () => {
    return <Skeleton active />
}

const BuildPageController = (route, element, bindProps) => {
    return React.createElement((props) => {
        const params = useParams()
        const url = new URL(window.location)
        const query = new Proxy(url, {
            get: (target, prop) => target.searchParams.get(prop),
        })

        route = route.replace(/\?.+$/, "").replace(/\/{2,}/g, "/")
        route = route.replace(/\/$/, "")

        return React.createElement(
            loadable(element, {
                fallback: React.createElement(DefaultLoadingRender),
            }),
            {
                ...props,
                ...bindProps,
                url: url,
                params: params,
                query: query,
            },
        )
    })
}

const NavigationController = (props) => {
    if (!app.location) {
        app.location = Object()
    }

    const [initialized, setInitialized] = React.useState(false)

    const navigate = useNavigate()

    async function setLocation(to, state = {}) {
        // clean double slashes
        to = to.replace(/\/{2,}/g, "/")

        if (typeof state !== "object") {
            state = {}
        }

        for (const listener of app.location.listeners) {
            if (typeof listener === "function") {
                listener(to, state)
            }
        }

        app.location.last = {
            path: app.location.path,
            search: app.location.search,
            state: app.location.state,
        }

        app.location.search = to.includes("?") ? to.split("?")[1] : ""
        app.location.state = state
        app.location.path = to

        document.startViewTransition(() => {
            navigate(to, {
                state
            })
        })
    }

    async function backLocation() {
        return setLocation(app.location.last.path + app.location.last.search, app.location.last.state)
    }

    function pushToListeners(listener) {
        app.location.listeners.push(listener)
    }

    function removeFromListeners(listener) {
        app.location.listeners = app.location.listeners.filter((item) => {
            return item !== listener
        })
    }

    React.useEffect(() => {
        app.location = {
            last: {
                path: "/",
                search: "",
                state: {},
            },
            path: "/",
            listeners: [],
            listen: pushToListeners,
            unlisten: removeFromListeners,
            push: setLocation,
            back: backLocation,
        }

        setInitialized(true)
    }, [])

    if (!initialized) {
        return <Skeleton />
    }

    return props.children
}

export const InternalRouter = (props) => {
    return <HashRouter >
        <NavigationController>
            {props.children}
        </NavigationController>
    </HashRouter>
}

export const PageRender = (props) => {
    const routes = React.useMemo(() => {
        let paths = {
            ...import.meta.glob("/src/pages/**/[a-z[]*.jsx"),
            ...import.meta.glob("/src/pages/**/[a-z[]*.tsx"),
        }

        paths = Object.keys(paths).map((route) => {
            let path = route
                .replace(/\/src\/pages|index|\.jsx$/g, "")
                .replace(/\/src\/pages|index|\.tsx$/g, "")
                .replace(/\/src\/pages|index|\.mobile|\.jsx$/g, "")
                .replace(/\/src\/pages|index|\.mobile|\.tsx$/g, "")

            path = path.replace(/\[\.{3}.+\]/, "*").replace(/\[(.+)\]/, ":$1")

            return {
                path,
                element: paths[route],
            }
        })

        return paths
    }, [])

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
        {
            routes.map((route, index) => {
                return <Route
                    key={index}
                    path={route.path}
                    element={BuildPageController(route.path, route.element, props)}
                    exact
                />
            })
        }

        <Route
            path="*"
            element={React.createElement(DefaultNotFoundRender)}
        />
    </Routes>
}