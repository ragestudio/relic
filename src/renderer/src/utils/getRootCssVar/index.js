function getRootCssVar(key) {
    const root = document.querySelector(':root')
    return window.getComputedStyle(root).getPropertyValue(key)
}

export default getRootCssVar