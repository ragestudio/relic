import React from "react"
import * as antd from "antd"

export const Context = React.createContext([])

export class WithContext extends React.Component {
    state = {
        installations: []
    }

    ipcEvents = {
        "new:installation": (event, data) => {
            antd.message.loading(`Installing ${data.id}`)

            let newData = this.state.installations

            // search if installation already exists
            const prev = this.state.installations.findIndex((item) => item.id === data.id)

            if (prev !== -1) {
                newData[prev] = data
            } else {
                newData.push(data)
            }

            this.setState({
                installations: newData,
            })
        },
        "installation:status": (event, data) => {
            console.log(`INSTALLATION STATUS: ${data.id} >`, data)

            const { id } = data

            let newData = this.state.installations

            const index = newData.findIndex((item) => item.id === id)

            if (index !== -1) {
                newData[index] = {
                    ...newData[index],
                    ...data,
                }

                this.setState({
                    installations: newData
                })
            }
        },
        "installation:error": (event, data) => {
            antd.message.error(`Failed to install ${data.id}`)

            this.ipcEvents["installation:status"](event, data)
        },
        "installation:done": (event, data) => {
            antd.message.success(`Successfully installed ${data.id}`)

            this.ipcEvents["installation:status"](event, data)
        },
        "installation:uninstalled": (event, data) => {
            antd.message.success(`Successfully uninstalled ${data.id}`)

            const index = this.state.installations.findIndex((item) => item.id === data.id)

            if (index !== -1) {
                this.setState({
                    installations: [
                        ...this.state.installations.slice(0, index),
                        ...this.state.installations.slice(index + 1),
                    ]
                })
            }
        }
    }

    componentDidMount = async () => {
        const installations = await ipc.exec("get:installations")

        for (const event in this.ipcEvents) {
            ipc.on(event, this.ipcEvents[event])
        }

        this.setState({
            installations: [
                ...this.state.installations,
                ...installations,
            ]
        })
    }

    componentWillUnmount() {
        for (const event in this.ipcEvents) {
            ipc.off(event, this.ipcEvents[event])
        }
    }

    render() {
        return <Context.Provider
            value={{
                installations: this.state.installations
            }}
        >
            {this.props.children}
        </Context.Provider>
    }
}

export default Context