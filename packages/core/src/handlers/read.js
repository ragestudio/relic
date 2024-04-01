import ManifestReader from "../manifest/reader"
import ManifestVM from "../manifest/vm"

export default async function softRead(manifest, options = {}) {
    const Reader = await ManifestReader(manifest)
    const VM = await ManifestVM(Reader.code, options)

    return VM
}