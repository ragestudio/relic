import Logger from "../logger"

import ISM_GIT_CLONE from "./git_clone"
import ISM_GIT_PULL from "./git_pull"
import ISM_GIT_RESET from "./git_reset"
import ISM_HTTP from "./http"
import ISM_TORRENT from "./torrent"

const InstallationStepsMethods = {
    git_clone: ISM_GIT_CLONE,
    git_pull: ISM_GIT_PULL,
    git_reset: ISM_GIT_RESET,
    http_file: ISM_HTTP,
    torrent: ISM_TORRENT,
}

const StepsOrders = [
    "git_clones",
    "git_pull",
    "git_reset",
    "torrent",
    "http_file",
]

export default async function processGenericSteps(pkg, steps, logger = Logger, abortController) {
    logger.info(`Processing generic steps...`)

    if (!Array.isArray(steps)) {
        throw new Error(`Steps must be an array`)
    }

    if (steps.length === 0) {
        return pkg
    }

    steps = steps.sort((a, b) => {
        return StepsOrders.indexOf(a.type) - StepsOrders.indexOf(b.type)
    })

    for await (let step of steps) {
        step.type = step.type.toLowerCase()

        if (abortController?.signal?.aborted) {
            return false
        }

        if (!InstallationStepsMethods[step.type]) {
            throw new Error(`Unknown step: ${step.type}`)
        }

        await InstallationStepsMethods[step.type](pkg, step, logger, abortController)
    }

    return pkg
}
