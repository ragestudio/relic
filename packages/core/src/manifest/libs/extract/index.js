import extractFile from "../../../utils/extractFile"
import { execa } from "../../../libraries/execa"
import Vars from "../../../vars"

export default class Extract {
    async extractFull(file, dest, { password } = {}) {
        const args = [
            "x",
            "-y",
        ]

        if (password) {
            args.push(`-p"${password}"`)
        }

        args.push(`-o"${dest}"`)

        args.push(`"${file}"`)

        const cmd = `${Vars.sevenzip_bin} ${args.join(" ")}`

        console.log(cmd)

        await execa(cmd, {
            shell: true,
            stdout: "inherit",
            stderr: "inherit",
        })
    }

    async autoExtract(file, dest) {
        return await extractFile(file, dest)
    }
}