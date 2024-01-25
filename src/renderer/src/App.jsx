import React from "react"
import * as antd from "antd"

import GlobalStateContext from "contexts/global"

import getRootCssVar from "utils/getRootCssVar"

import ManifestInfo from "components/ManifestInfo"
import PackageUpdateAvailable from "components/PackageUpdateAvailable"

import AppLayout from "layout"
import AppModalDialog from "layout/components/ModalDialog"

import { InternalRouter, PageRender } from "./router.jsx"

globalThis.getRootCssVar = getRootCssVar
globalThis.notification = antd.notification
globalThis.message = antd.message

// create a global app context
window.app = {
  applyUpdate: () => {
    antd.message.loading("Updating, please wait...")

    ipc.exec("updater:apply")
  },
  invokeInstall: (manifest) => {
    console.log(`installation invoked >`, manifest)

    app.modal.open(ManifestInfo, {
      manifest: manifest,
      close: () => {
        app.modal.close()
      }
    })
  },
  pkgUpdateAvailable: (update_data) => {
    app.modal.open(PackageUpdateAvailable, {
      update: update_data,
      close: () => {
        app.modal.close()
      }
    })
  },
  checkUpdates: () => {
    ipc.exec("updater:check")
  },
}

class App extends React.Component {
  state = {
    loading: true,
    pkg: null,
    initializing: false,
    updateAvailable: false,

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
      this.onUpdateAvailable(data)
    },
    "pkg:update_available": (event, data) => {
      app.pkgUpdateAvailable(data)
    },
    "initializing_text": (event, data) => {
      this.setState({
        initializing_text: data,
      })
    },
    "installation:invoked": (event, manifest) => {
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
    }
  }

  onUpdateAvailable = () => {
    this.setState({
      updateAvailable: true,
    })

    console.log(data)

    antd.Modal.confirm({
      title: "Update Available",
      content: <>
        <p>
          A new version of the application is available.
        </p>
      </>,
      okText: "Update",
      cancelText: "Later",
      onOk: () => {
        app.applyUpdate()
      }
    })
  }

  componentDidMount = async () => {
    for (const event in this.ipcEvents) {
      ipc.on(event, this.ipcEvents[event])
    }

    const initResult = await ipc.exec("app:init")

    console.log(`[INIT] >`, initResult)

    app.location.push("/")

    this.setState({
      loading: false,
      pkg: initResult.pkg,
      authorizedServices: {
        drive: initResult.authorizedServices?.drive ?? false
      },
    })
  }

  componentWillUnmount = () => {
    for (const event in this.ipcEvents) {
      ipc.off(event, this.ipcEvents[event])
    }
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
