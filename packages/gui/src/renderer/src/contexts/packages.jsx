import React from "react"
import * as antd from "antd"

export const Context = React.createContext([])

export class WithContext extends React.Component {
    state = {
        packages: [],
        pendingInstallation: false,
    }

    ipcEvents = {
        "pkg:new:done": (event, data) => {
            antd.message.success(`Successfully installed ${data.name}`)
        },
        "pkg:new": (event, data) => {
            antd.message.loading(`Installing ${data.id}`)

            let newData = this.state.packages

            // search if installation already exists
            const prev = this.state.packages.findIndex((item) => item.id === data.id)

            if (prev !== -1) {
                newData[prev] = data
            } else {
                newData.push(data)
            }

            this.setState({
                packages: newData,
            })
        },
        "pkg:remove": (event, data) => {
            antd.message.success(`Successfully uninstalled ${data.id}`)

            const index = this.state.packages.findIndex((item) => item.id === data.id)

            if (index !== -1) {
                this.setState({
                    packages: [
                        ...this.state.packages.slice(0, index),
                        ...this.state.packages.slice(index + 1),
                    ]
                })
            }
        },
        "pkg:update:state": (event, data) => {
            const { id } = data

            let newData = this.state.packages

            const index = newData.findIndex((item) => item.id === id)

            if (index !== -1) {
                newData[index] = {
                    ...newData[index],
                    ...data,
                }

                this.setState({
                    packages: newData
                })
            }

            console.log(`[ipc] pkg:update:state >`, data)
        }
    }

    componentDidMount = async () => {
        const packages = await ipc.exec("pkg:list")

        for (const event in this.ipcEvents) {
            ipc.exclusiveListen(event, this.ipcEvents[event])
        }

        this.setState({
            packages: [
                ...this.state.packages,
                ...packages,
            ]
        })
    }

    render() {
        return <Context.Provider
            value={{
                packages: this.state.packages,
                install: this.install
            }}
        >
            {this.props.children}
        </Context.Provider>
    }
}

export default Context