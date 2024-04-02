import React from "react"
import { Modal } from "antd"

const AppModalDialog = () => {
    const [render, setRender] = React.useState(null)

    const c_interface = {
        open: (component, props) => {
            setRender({
                component: component,
                props: props
            })
        },
        close: () => {
            setRender(null)
        }
    }

    React.useEffect(() => {
        window.app.modal = c_interface

        return () => {
            window.app.modal = null
            delete window.app.modal
        }
    }, [])

    return <Modal
        open={render !== null}
        onCancel={() => c_interface.close()}
        footer={null}
        destroyOnClose
    >
        {
            render && render.component && React.createElement(render.component, render.props)
        }
    </Modal>
}

export default AppModalDialog