import React from "react"
import * as antd from "antd"

import BarLoader from "react-spinners/BarLoader"

import GlobalStateContext from "contexts/global"

import getRootCssVar from "utils/getRootCssVar"

import InstallationsManager from "pages/manager"

import { MdFolder, MdSettings, MdDownload } from "react-icons/md"

import Icon from "../assets/icon.jsx"

globalThis.getRootCssVar = getRootCssVar

const PageRender = () => {
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

globalThis.notification = antd.notification
globalThis.message = antd.message

class App extends React.Component {
  state = {
    loading: true,
    pkg: null,
    initializing: false,
    updateAvailable: true,
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
          this.applyUpdate()
        }
      })
    }
  }

  applyUpdate = () => {
    antd.message.loading("Updating, please wait...")

    ipc.exec("updater:apply")
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
    const { loading, pkg } = this.state

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
        <antd.Layout className="app_layout">
          <antd.Layout.Header className="app_header">
            <div className="branding">
              <Icon />
            </div>

            {
              !loading && <div className="menu">
                {
                  this.state.updateAvailable && <antd.Button
                    size="small"
                    icon={<MdDownload />}
                    onClick={this.applyUpdate}
                  >
                    Update now
                  </antd.Button>
                }

                <antd.Button
                  size="small"
                  icon={<MdSettings />}
                />

                <antd.Button
                  size="small"
                  icon={<MdFolder />}
                  onClick={() => ipc.send("open-runtime-path")}
                />

                {
                  pkg && <antd.Tag>
                    v{pkg.version}
                  </antd.Tag>
                }
              </div>
            }
          </antd.Layout.Header>

          <antd.Layout.Content className="app_content">
            <PageRender />
          </antd.Layout.Content>
        </antd.Layout>
      </GlobalStateContext.Provider>
    </antd.ConfigProvider>
  }
}

export default App
