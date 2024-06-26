export default function parseStringVars(str, pkg) {
    if (!pkg) {
        return str
    }

    const vars = {
        id: pkg.id,
        name: pkg.name,
        version: pkg.version,
        install_path: pkg.install_path,
        remote: pkg.remote,
    }

    const regex = /%([^%]+)%/g

    str = str.replace(regex, (match, varName) => {
        return vars[varName]
    })

    return str
}