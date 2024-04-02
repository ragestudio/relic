import GlobalApp from "./GlobalApp.jsx"

import React from "react"
import * as antd from "antd"

import versions from "utils/getVersions"
import GlobalStateContext from "contexts/global"

import AppLayout from "layout"
import AppModalDialog from "layout/components/ModalDialog"
import AppDrawer from "layout/components/Drawer"

import { InternalRouter, PageRender } from "./router.jsx"

// create a global app context
window.app = GlobalApp

class App extends React.Component {
  state = {
    initializing: true,
    pkg: null,

    appSetup: {
      error: false,
      installed: false,
      message: null,
    },

    appUpdate: {
      changelog: null,
      available: false,
    },

    authorizedServices: [],
  }

  ipcEvents = {
    "new:notification": (event, data) => {
      app.notification[data.type || "info"]({
        message: data.message,
        description: data.description,
        loading: data.loading,
        duration: data.duration,
        icon: data.icon,
        placement: "bottomLeft"
      })
    },
    "new:message": (event, data) => {
      antd.message[data.type || "info"](data.message)
    },
    "app:setup": (event, data) => {
      this.setState({
        appSetup: data,
      })
    },
    "app:update_available": (event, data) => {
      if (this.state.initializing) {
        return false
      }

      this.setState({
        appUpdate: {
          available: true,
        },
      })

      app.appUpdateAvailable(data)
    },
    "pkg:install:ask": (event, data) => {
      if (this.state.initializing) {
        return false
      }

      app.pkgInstallWizard(data)
    },
    "pkg:update_available": (event, data) => {
      if (this.state.initializing) {
        return false
      }

      app.pkgUpdateAvailable(data)
    },
    "pkg:installation:invoked": (event, data) => {
      if (this.state.initializing) {
        return false
      }

      app.invokeInstall(data)
    },
    "app:init:failed": (event, data) => {
      this.setState({
        crash: data,
      })
    }
  }

  componentDidMount = async () => {
    console.log(`React version > ${versions["react"]}`)
    console.log(`DOMRouter version > ${versions["react-router-dom"]}`)

    window.app.style.appendClassname("initializing")

    for (const event in this.ipcEvents) {
      ipc.exclusiveListen(event, this.ipcEvents[event])
    }

    const mainInitialization = await ipc.exec("app:init")

    console.log(`app:init() | Result >`, mainInitialization)

    if (mainInitialization.error) {
      return false
    }

    await this.setState({
      initializing: false,
      pkg: mainInitialization.pkg,
    })

    app.location.push("/")

    window.app.style.removeClassname("initializing")
  }

  render() {
    return <antd.ConfigProvider
      theme={{
        token: {
          colorPrimary: getRootCssVar("--primary-color"),
          colorBgContainer: getRootCssVar("--background-color-primary"),
          colorPrimaryBg: getRootCssVar("--background-color-primary"),
        },
        algorithm: antd.theme.darkAlgorithm
      }}
    >
      <InternalRouter>
        <GlobalStateContext.Provider value={this.state}>

          <AppDrawer />
          <AppModalDialog />

          <AppLayout>
            <PageRender />
          </AppLayout>
        </GlobalStateContext.Provider>
      </InternalRouter>
    </antd.ConfigProvider>
  }
}

export default App
