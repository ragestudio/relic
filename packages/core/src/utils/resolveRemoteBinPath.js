export default (pre, post) => {
    let url = null

    if (process.platform === "darwin") {
        url = `${pre}/darwin/${process.arch}/${post}`
    }
    else if (process.platform === "win32") {
        url = `${pre}/win32/${process.arch}/${post}`
    }
    else {
        url = `${pre}/linux/${process.arch}/${post}`
    }

    return url
}