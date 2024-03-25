import sendToRender from "./utils/sendToRender"

global.SettingsStore = new Store({
	name: "settings",
	watch: true,
})

import path from "node:path"

import { app, shell, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import isDev from "electron-is-dev"
import Store from "electron-store"

import pkg from "../../package.json"

import setup from "./setup"

import PkgManager from "./manager"
import { readManifest } from "./utils/readManifest"

import GoogleDriveAPI from "./lib/google_drive"

import AuthService from "./auth"

const { autoUpdater } = require("electron-differential-updater")
const ProtocolRegistry = require("protocol-registry")

const protocolRegistryNamespace = "rsbundle"

class ElectronApp {
	constructor() {
		this.pkgManager = new PkgManager()
		this.win = null
	}

	authService = global.authService = new AuthService()

	handlers = {
		"pkg:list": async () => {
			return await this.pkgManager.getInstalledPackages()
		},
		"pkg:get": async (event, manifest_id) => {
			return await this.pkgManager.getInstalledPackages(manifest_id)
		},
		"pkg:read": async (event, manifest_url) => {
			return JSON.stringify(await readManifest(manifest_url))
		},
		"pkg:install": async (event, manifest) => {
			this.pkgManager.install(manifest)
		},
		"pkg:update": async (event, manifest_id, { execOnFinish = false } = {}) => {
			await this.pkgManager.update(manifest_id)

			if (execOnFinish) {
				await this.pkgManager.execute(manifest_id)
			}
		},
		"pkg:apply": async (event, manifest_id, changes) => {
			return await this.pkgManager.applyChanges(manifest_id, changes)
		},
		"pkg:retry_install": async (event, manifest_id) => {
			const pkg = await this.pkgManager.getInstalledPackages(manifest_id)

			if (!pkg) {
				return false
			}

			await this.pkgManager.install(pkg)
		},
		"pkg:cancel_install": async (event, manifest_id) => {
			return await this.pkgManager.uninstall(manifest_id)
		},
		"pkg:delete_auth": async (event, manifest_id) => {
			return this.authService.unauthorize(manifest_id)
		},
		"pkg:uninstall": async (event, ...args) => {
			return await this.pkgManager.uninstall(...args)
		},
		"pkg:execute": async (event, ...args) => {
			return await this.pkgManager.execute(...args)
		},
		"pkg:open": async (event, manifest_id) => {
			return await this.pkgManager.open(manifest_id)
		},
		"updater:check": () => {
			autoUpdater.checkForUpdates()
		},
		"updater:apply": () => {
			setTimeout(() => {
				autoUpdater.quitAndInstall()
			}, 3000)
		},
		"settings:get": (e, key) => {
			return global.SettingsStore.get(key)
		},
		"settings:set": (e, key, value) => {
			return global.SettingsStore.set(key, value)
		},
		"settings:delete": (e, key) => {
			return global.SettingsStore.delete(key)
		},
		"settings:has": (e, key) => {
			return global.SettingsStore.has(key)
		},
		"app:init": async (event, data) => {
			try {
				await setup()
			} catch (err) {
				console.error(err)

				sendToRender("new:notification", {
					message: "Setup failed",
					description: err.message
				})
			}

			// check if can decode google drive token
			const googleDrive_enabled = !!(await GoogleDriveAPI.readCredentials())

			return {
				pkg: pkg,
				authorizedServices: {
					drive: googleDrive_enabled
				}
			}
		}
	}

	events = {
		"open-runtime-path": () => {
			return this.pkgManager.openRuntimePath()
		},
		"open-dev-logs": () => {
			return sendToRender("new:message", {
				message: "Not implemented yet",
			})
		}
	}

	createWindow() {
		this.win = global.win = new BrowserWindow({
			width: 450,
			height: 670,
			show: false,
			resizable: false,
			autoHideMenuBar: true,
			icon: "../../resources/icon.png",
			webPreferences: {
				preload: path.join(__dirname, "../preload/index.js"),
				sandbox: false
			}
		})

		this.win.on("ready-to-show", () => {
			this.win.show()
		})

		this.win.webContents.setWindowOpenHandler((details) => {
			shell.openExternal(details.url)

			return { action: "deny" }
		})

		if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
			this.win.loadURL(process.env["ELECTRON_RENDERER_URL"])
		} else {
			this.win.loadFile(path.join(__dirname, "../renderer/index.html"))
		}
	}

	handleURLProtocol(url) {
		const urlStarter = `${protocolRegistryNamespace}://`

		console.log(url)

		if (url.startsWith(urlStarter)) {
			const urlValue = url.split(urlStarter)[1]

			let explicitAction = urlValue.split("#")

			// remove trailing slash for windows :(
			if (explicitAction[0].endsWith("/")) {
				explicitAction[0] = explicitAction[0].slice(0, -1)
			}

			console.log(explicitAction)

			if (explicitAction.length > 0) {
				switch (explicitAction[0]) {
					case "authorize": {
						if (!explicitAction[2]) {
							const [pkgid, token] = explicitAction[1].split("%23")
							return this.authService.authorize(pkgid, token)
						} else {
							return this.authService.authorize(explicitAction[1], explicitAction[2])
						}
					}
					default: {
						return sendToRender("installation:invoked", explicitAction[0])
					}
				}
			} else {
				// by default if no action is specified, assume is a install action
				return sendToRender("installation:invoked", urlValue)
			}
		}
	}

	handleOnSecondInstance = async (event, commandLine, workingDirectory) => {
		event.preventDefault()

		// Someone tried to run a second instance, we should focus our window.
		if (this.win) {
			if (this.win.isMinimized()) {
				this.win.restore()
			}

			this.win.focus()
		}

		console.log(`Second instance >`, commandLine)

		const url = commandLine.pop()

		await this.handleURLProtocol(url)
	}

	async initialize() {
		// Set app user model id for windows
		electronApp.setAppUserModelId("com.electron")

		const gotTheLock = await app.requestSingleInstanceLock()

		if (!gotTheLock) {
			return app.quit()
		}

		for (const key in this.handlers) {
			ipcMain.handle(key, this.handlers[key])
		}

		for (const key in this.events) {
			ipcMain.on(key, this.events[key])
		}

		app.on("second-instance", this.handleOnSecondInstance)

		app.on("open-url", (event, url) => {
			event.preventDefault()

			this.handleURLProtocol(url)
		})

		app.on("browser-window-created", (_, window) => {
			optimizer.watchWindowShortcuts(window)
		})

		app.on("activate", () => {
			if (BrowserWindow.getAllWindows().length === 0) {
				this.createWindow()
			}
		})

		app.on("window-all-closed", () => {
			if (process.platform !== "darwin") {
				app.quit()
			}
		})

		await app.whenReady()

		if (isDev) {
			if (app.isDefaultProtocolClient(protocolRegistryNamespace)) {
				app.removeAsDefaultProtocolClient(protocolRegistryNamespace)
			}

			ProtocolRegistry.register({
				protocol: protocolRegistryNamespace,
				command: `"${process.execPath}" "${path.resolve(process.argv[1])}" $_URL_`,
				override: true,
				script: true,
				terminal: false
			})
		} else {
			if (!app.isDefaultProtocolClient(protocolRegistryNamespace)) {
				app.setAsDefaultProtocolClient(protocolRegistryNamespace)
			}
		}

		await GoogleDriveAPI.init()

		await this.createWindow()

		if (!isDev) {
			autoUpdater.on("update-available", (ev, info) => {
				console.log(info)
				sendToRender("app:checking_update_downloading", info)
			})

			autoUpdater.on("error", (ev, err) => {
				console.error(err)
				sendToRender("app:checking_update_error")
			})

			autoUpdater.on("update-downloaded", (ev, info) => {
				console.log(info)
				sendToRender("app:update_available", info)
			})

			sendToRender("app:checking_update")

			await autoUpdater.checkForUpdates()
		}
	}
}

new ElectronApp().initialize()
