import PublicInternalLibraries from "./libs"

const isAClass = (x) => x && typeof x === "function" && x.prototype && typeof x.prototype.constructor === "function"

export default async (dependencies, bindCtx) => {
    const libraries = {}

    for await (const lib of dependencies) {
        if (PublicInternalLibraries[lib]) {
            if (typeof PublicInternalLibraries[lib] === "function" && isAClass(PublicInternalLibraries[lib])) {
                libraries[lib] = new PublicInternalLibraries[lib](bindCtx)

                if (libraries[lib].initialize) {
                    await libraries[lib].initialize()
                }
            } else {
                libraries[lib] = PublicInternalLibraries[lib]
            }
        }
    }

    return libraries
}