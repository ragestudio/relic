import winston from "winston"
import WinstonTransport from "winston-transport"
import colors from "cli-color"

const servicesToColor = {
    "CORE": {
        color: "whiteBright",
        background: "bgBlackBright",
    },
}

const paintText = (level, service, ...args) => {
    let { color, background } = servicesToColor[service ?? "CORE"] ?? servicesToColor["CORE"]

    if (level === "error") {
        color = "whiteBright"
        background = "bgRedBright"
    }

    return colors[background][color](...args)
}

const format = winston.format.printf(({ timestamp, service = "CORE", level, message, }) => {
    return `${paintText(level, service, `(${level}) [${service}]`)} > ${message}`
})

class EventBusTransport extends WinstonTransport {
    log(info, next) {
        global._relic_eventBus.emit(`logger:new`, info)
        next()
    }
}

export default winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        format
    ),
    transports: [
        new winston.transports.Console(),
        new EventBusTransport(),
        //new winston.transports.File({ filename: "error.log", level: "error" }),
        //new winston.transports.File({ filename: "combined.log" }),
    ],
})