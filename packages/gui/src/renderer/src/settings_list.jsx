import React from "react"
import { Button } from "antd"

export default [
	{
		id: "services",
		name: "Services",
		icon: "MdAccountTree",
		children: [
			{
				id: "drive_auth",
				name: "Google Drive",
				description: "Authorize your Google Drive account to be used for bundles installation.",
				icon: "SiGoogledrive",
				type: "button",
				storaged: false,
				watchIpc: ["drive:authorized", "drive:unauthorized"],
				defaultValue: async () => {
					return await api.settings.get("drive_auth")
				},
				render: (props) => {
					return (
						<Button
							disabled
							type={props.value ? "primary" : "default"}
							onClick={() => {
								if (!props.value) {
									message.info("Authorizing...")

									return ipc.exec("drive:authorize")
								}

								return ipc.exec("drive:unauthorize")
							}}
						>
							{props.value ? "Unauthorize" : "Authorize"}
						</Button>
					)
				}
			}
		]
	},
	{
		id: "updates",
		name: "Updates",
		icon: "MdUpdate",
		children: [
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
			},
			{
				id: "pkg_auto_update_on_execute",
				name: "Packages auto update",
				description: "If a update is available, automatically update the app when it is executed.",
				icon: "MdUpdate",
				type: "switch",
				storaged: true,
				defaultValue: false,
				props: {
					disabled: true
				}
			}
		]
	},
	{
		id: "other",
		name: "Other",
		icon: "MdSettings",
		children: [
			{
				id: "change_packages_path",
				name: "Change packages path",
				description: "Change the folder where all packages will be installed.",
				icon: "MdFolder",
				type: "button",
				defaultValue: async () => {
					return await ipc.exec("settings:get", "packages_path")
				},
				render: (props) => {
					return <>
						<Button
							style={{
								width: "100%",
							}}
							onClick={async () => {
								const path = await ipc.exec("core:change-packages-path")

								if (path) {
									props.handleChange(path)
								}
							}}
						>
							Change
						</Button>
						<Button
							type="link"
							size="small"
							onClick={async () => {
								const path = await ipc.exec("core:set-default-packages-path")

								if (path) {
									props.handleChange(path)
								}
							}}
						>
							Reset
						</Button>
					</>
				},
				footer: (props) => {
					return <span style={{ fontSize: "0.6rem" }}>{props.value}</span>
				},
				storaged: false
			},
			{
				id: "open_settings_path",
				name: "Open settings path",
				description: "Open the folder where all packages are stored.",
				icon: "MdFolder",
				type: "button",
				props: {
					children: "Open",
					onClick: () => {
						ipc.exec("core:open-path")
					}
				},
				storaged: false
			},
			{
				id: "open_dev_logs",
				name: "Open internal logs",
				description: "Open the internal logs of the app.",
				icon: "MdTerminal",
				type: "button",
				props: {
					children: "Open",
					onClick: () => {
						ipc.exec("app:open-logs")
					}
				},
				storaged: false
			}
		]
	}
]
