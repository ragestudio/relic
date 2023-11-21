import { Button } from "antd"

export default [
    {
        id: "drive_auth",
        name: "Google Drive Authorize",
        description: "Authorize your Google Drive account to be used for bundles installation.",
        icon: "SiGoogledrive",
        type: "button",
        storaged: false,
        watchIpc: ["drive:authorized", "drive:unauthorized"],
        defaultValue: async () => {
            return await api.settings.get("drive_auth")
        },
        render: (props) => {
            return <Button
                type={props.value ? "primary" : "default"}
                onClick={() => {
                    if (!props.value) {
                        message.info("Authorizing...")

                        return ipc.exec("drive:authorize")
                    }

                    return ipc.exec("drive:unauthorize")
                }}
            >
                {
                    props.value ? "Unauthorize" : "Authorize"
                }
            </Button>
        }
    },
    {
        id: "check_update",
        name: "Check for updates",
        description: "Check for updates to the app.",
        icon: "MdUpdate",
        type: "button",
        props: {
            children: "Check",
            onClick: () => {
                message.info("Checking for updates...")
                app.checkUpdates()
            }
        },
        storaged: false
    }
]
