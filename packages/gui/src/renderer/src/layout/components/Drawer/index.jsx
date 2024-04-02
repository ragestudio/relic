import React from "react"
import { Drawer } from "antd"

const AppDrawer = () => {
    const [render, setRender] = React.useState(null)

    const c_interface = {
        open: (component, params) => {
            setRender({
                component: component,
                params: params ?? {}
            })
        },
        close: () => {
            setRender(null)
        }
    }

    React.useEffect(() => {
        window.app.drawer = c_interface

        return () => {
            window.app.drawer = null
            delete window.app.drawer
        }
    }, [])

    return <Drawer
        open={render !== null}
        onClose={() => c_interface.close()}
        destroyOnClose
        placement="bottom"
        title={render && render.params && render.params.title}
        height={render && render.params && render.params.height}
    >
        {
            render && render.component && React.createElement(render.component, {
                ...render.params.props ?? {},
                close: () => c_interface.close()
            })
        }
    </Drawer>
}

export default AppDrawer