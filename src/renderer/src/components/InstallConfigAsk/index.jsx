import React from "react"
import * as antd from "antd"

import PKGConfigItem from "../PackageConfigItem"

import "./index.less"

const InstallConfigAsk = (props) => {
    const { manifest } = props

    const [values, setValues] = React.useState({
        ...Object.entries(manifest.configs).reduce((acc, [key, value]) => {
            acc[key] = value.default

            return acc
        }, {}),
        ...manifest.storaged_configs,
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

            if (!config.id) {
                config.id = key
            }

            const storagedConfig = manifest.storaged_configs?.[key] ?? manifest.configs[key].default

            return <PKGConfigItem
                key={index}
                config={config}
                storagedValue={storagedConfig}
                onChange={handleChanges}
            />
        })

        return steps
    }, [])

    console.log(values)

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