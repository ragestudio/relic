import sendToRender from "../../utils/sendToRender"

export default class RendererIPC {
    static async send(...args) {
        return await sendToRender(...args)
    }
}