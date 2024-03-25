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
    loading: true,
    pkg: null,
    initializing: false,

    updateAvailable: false,
    updateText: null,

    authorizedServices: {
      drive: false,
    },
  }

  ipcEvents = {
    "runtime:error": (event, data) => {
      antd.message.error(data)
    },
    "runtime:info": (event, data) => {
      antd.message.info(data)
    },
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
    "app:update_available": (event, data) => {
      if (this.state.loading) {
        return false
      }

      this.setState({
        updateAvailable: true,
      })

      app.appUpdateAvailable(data)
    },
    "pkg:install:ask": (event, data) => {
      if (this.state.loading) {
        return false
      }

      app.pkgInstallWizard(data)
    },
    "pkg:update_available": (event, data) => {
      if (this.state.loading) {
        return false
      }

      app.pkgUpdateAvailable(data)
    },
    "installation:invoked": (event, manifest) => {
      if (this.state.loading) {
        return false
      }

      app.invokeInstall(manifest)
    },
    "drive:authorized": (event, data) => {
      this.setState({
        authorizedServices: {
          drive: true,
        },
      })

      message.success("Google Drive API authorized")
    },
    "drive:unauthorized": (event, data) => {
      this.setState({
        authorizedServices: {
          drive: false,
        },
      })

      message.success("Google Drive API unauthorized")
    },
    "setup:step": (event, data) => {
      this.setState({
        setup_step: data,
      })
    },
  }

  componentDidMount = async () => {
    const initResult = await ipc.exec("app:init")

    console.log(`Using React version > ${versions["react"]}`)
    console.log(`Using DOMRouter version > ${versions["react-router-dom"]}`)
    console.log(`[APP] app:init() | Result >`, initResult)

    for (const event in this.ipcEvents) {
      ipc.exclusiveListen(event, this.ipcEvents[event])
    }

    app.location.push("/")

    this.setState({
      loading: false,
      pkg: initResult.pkg,
      authorizedServices: {
        drive: initResult.authorizedServices?.drive ?? false
      },
    })
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
