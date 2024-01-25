import React from "react"
import * as antd from "antd"

import AppHeader from "./components/Header"

const Layout = (props) => {
    const [api, contextHolder] = antd.notification.useNotification({
        stack: {
            threshold: 1
        }
    })

    React.useEffect(() => {
        app.notification = api
    }, [])

    return <antd.Layout className="app_layout">
        {contextHolder}

        <AppHeader />

        <antd.Layout.Content className="app_content">
            {props.children}
        </antd.Layout.Content>
    </antd.Layout>
}

export default Layout