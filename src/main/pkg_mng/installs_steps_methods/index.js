import ISM_DRIVE_DL from "./drive"
import ISM_HTTP from "./http"
import ISM_GIT_CLONE from "./git_clone"
import ISM_GIT_PULL from "./git_pull"

const InstallationStepsMethods = {
    drive_dl: ISM_DRIVE_DL,
    http: ISM_HTTP,
    git_clone: ISM_GIT_CLONE,
    git_pull: ISM_GIT_PULL,
}

export default async function processGenericSteps(pkg, steps) {
    console.log(`[${pkg.id}] steps() | Processing steps...`, steps)

    for await (const [stepKey, stepValue] of Object.entries(steps)) {
        switch (stepKey) {
            case "drive_downloads": {
                for await (const dl_step of stepValue) {
                    await InstallationStepsMethods.drive_dl(pkg, dl_step)
                }
                break;
            }
            case "http_downloads": {
                for await (const dl_step of stepValue) {
                    await InstallationStepsMethods.http(pkg, dl_step)
                }
                break;
            }
            case "git_clones":
            case "git_clones_steps": {
                for await (const clone_step of stepValue) {
                    await InstallationStepsMethods.git_clone(pkg, clone_step)
                }
                break;
            }
            case "git_pulls":
            case "git_update":
            case "git_pulls_steps": {
                for await (const pull_step of stepValue) {
                    await InstallationStepsMethods.git_pull(pkg, pull_step)
                }
                break;
            }
            default: {
                throw new Error(`Unknown step: ${stepKey}`)
            }
        }
    }

    return pkg
}
