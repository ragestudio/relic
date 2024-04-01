import { JSONFilePreset } from "./lib/lowdb"

import DefaultDB from "./defaults/local_db"
import Vars from "./vars"

export async function withDB() {
    return await JSONFilePreset(Vars.local_db, DefaultDB)
}

export async function updateInstalledPackage(pkg) {
    const db = await withDB()

    await db.update((data) => {
        const prevIndex = data["packages"].findIndex((i) => i.id === pkg.id)

        if (prevIndex !== -1) {
            data["packages"][prevIndex] = pkg
        } else {
            data["packages"].push(pkg)
        }

        return data
    })

    return pkg
}

export async function getInstalledPackages(pkg_id) {
    const db = await withDB()

    if (pkg_id) {
        return db.data["packages"].find((i) => i.id === pkg_id)
    }

    return db.data["packages"]
}

export async function deleteInstalledPackage(pkg_id) {
    const db = await withDB()

    await db.update((data) => {
        data["packages"] = data["packages"].filter((i) => i.id !== pkg_id)

        return data
    })

    return pkg_id
}

export default withDB