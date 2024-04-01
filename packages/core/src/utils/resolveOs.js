import os from "node:os"

export default () => {
    if (os.platform() === "win32") {
        return "windows"
    }

    if (os.platform() === "darwin") {
        return "macos"
    }

    if (os.platform() === "linux") {
        return "linux"
    }

    return os.platform()
}