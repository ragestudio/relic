import vm from "node:vm"
import fs from "node:fs"
import { transform } from "sucrase"

const file = process.argv[2]

let globalContext = {
    wrap: (url) => {
        return console.log(a)
    }
}

const localFile = fs.readFileSync(file).toString()
const transformed = transform(localFile, { transforms: ["typescript", "imports"] }).code

const script = new vm.Script(transformed)

vm.createContext(globalContext)

script.runInContext(globalContext)