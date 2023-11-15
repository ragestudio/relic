import React from "react"
import * as antd from "antd"

import GlobalStateContext from "contexts/global"

import getRootCssVar from "utils/getRootCssVar"

import ManifestInfo from "components/ManifestInfo"

import AppHeader from "layout/components/Header"
import AppModalDialog from "layout/components/ModalDialog"

import { PageRender } from "./router.jsx"

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
  }
}

class App extends React.Component {
  state = {
    loading: true,
    pkg: null,
    initializing: false,
    updateAvailable: false,
  }

  ipcEvents = {
    "runtime:error": (event, data) => {
      antd.message.error(data)
    },
    "runtime:info": (event, data) => {
      antd.message.info(data)
    },
    "initializing_text": (event, data) => {
      this.setState({
        initializing_text: data,
      })
    },
    "installation:invoked": (event, manifest) => {
      app.invokeInstall(manifest)
    },
    "new:notification": (event, data) => {
      antd.notification[data.type || "info"]({
        message: data.message,
        description: data.description,
        loading: data.loading,
        duration: data.duration,
        icon: data.icon,
      })
    },
    "new:message": (event, data) => {
      antd.message[data.type || "info"](data.message)
    },
    "update-available": (event, data) => {
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
  }

  componentDidMount = async () => {
    for (const event in this.ipcEvents) {
      ipc.on(event, this.ipcEvents[event])
    }

    const pkg = await ipc.exec("pkg")

    await ipc.exec("check:setup")

    this.setState({
      pkg: pkg,
      loading: false,
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
      <GlobalStateContext.Provider value={this.state}>
        <AppModalDialog />

        <antd.Layout className="app_layout">
          <AppHeader />

          <antd.Layout.Content className="app_content">
            <PageRender />
          </antd.Layout.Content>
        </antd.Layout>
      </GlobalStateContext.Provider>
    </antd.ConfigProvider>
  }
}

export default App
