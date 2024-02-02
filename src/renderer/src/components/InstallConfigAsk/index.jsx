import React from "react"
import { Icons, Icon } from "components/Icons"

import * as antd from "antd"

import PKGConfigItem from "../PackageConfigItem"

import "./index.less"

const InstallConfigAsk = (props) => {
    const { manifest } = props

    const [values, setValues] = React.useState({
        ...manifest.storaged_configs,
        ...Object.keys(manifest.configs).reduce((prev, key) => {
            prev[key] = manifest.configs[key].default

            return prev
        }, {})
    })

    const [currentStep, setCurrentStep] = React.useState(0)

    function handleChanges(key, value) {
        setValues((prev) => {
            return {
                ...prev,
                [key]: value
            }
        })
    }

    function handleNextStep() {
        setCurrentStep(currentStep + 1)
    }

    function handleFinish() {
        console.log(`Finish config wizard, with values >`, values)

        if (typeof props.onFinish === "function") {
            props.onFinish(values)
        }

        if (typeof props.close === "function") {
            props.close()
        }

        if (typeof props.onClose === "function") {
            props.onClose()
        }

        ipc.exec("pkg:apply", manifest.id, {
            configs: values
        })

        app.location.push("/")
    }

    const stepsItems = React.useMemo(() => {
        const steps = manifest.install_ask_configs.map((key, index) => {
            return {
                key: index,
                title: manifest.configs[key].label
            }
        })

        return [...steps, {
            key: manifest.install_ask_configs.length,
            title: "Finish"
        }]
    }, [])

    const stepsContent = React.useMemo(() => {
        const steps = manifest.install_ask_configs.map((key, index) => {
            const config = manifest.configs[key]

            return <PKGConfigItem
                key={index}
                config={config}
                storagedValue={manifest.storaged_configs[key]}
                onChange={handleChanges}
            />
        })

        return steps
    }, [])

    return <div className="install_config_ask">
        <antd.Steps
            size="small"
            direction="horizontal"
            items={stepsItems}
            current={currentStep}
            responsive={false}
            onChange={(e) => {
                setCurrentStep(currentStep)
            }}
        />

        <div className="install_config_ask-content">
            {stepsContent[currentStep]}
        </div>

        <div className="install_config_ask-actions">
            <antd.Button
                type="primary"
                onClick={() => {
                    if (currentStep === stepsItems.length - 2) {
                        handleFinish()
                    } else {
                        handleNextStep()
                    }
                }}
            >
                {currentStep === stepsItems.length - 2 ? "Finish" : "Next"}
            </antd.Button>
        </div>
    </div>
}

export default InstallConfigAsk