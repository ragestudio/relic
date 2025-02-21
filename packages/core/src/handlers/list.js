import DB from "../db"

export default async function list() {
    return await DB.getPackages()
}