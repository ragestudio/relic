export default (pre, post) => {
    let url = null

    if (process.platform === "darwin") {
        url = `${pre}/mac/${process.arch}/${post}`
    }
    else if (process.platform === "win32") {
        url = `${pre}/win/${process.arch}/${post}`
    }
    else {
        url = `${pre}/linux/${process.arch}/${post}`
    }

    return url
}