import React from "react"
import { version as reactRouterDomVersion } from "react-router-dom/package.json"
import { version as antdVersion } from "antd"

export default {
    "ui": antdVersion,
    "react-router-dom": reactRouterDomVersion,
    "react": React.version,
    "electron": window.versions.electron,
    "node": window.versions.node,
}