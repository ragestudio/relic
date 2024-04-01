import sendToRender from "../../utils/sendToRender"

export default class RendererIPC {
    async send(...args) {
        return await sendToRender(...args)
    }
}