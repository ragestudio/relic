import React from "react"
import "./index.less"

const Crash = (props) => {
    const { crash } = props

    return <div className="app-crash">
        <div className="crash-icon">
            <img
                src="/assets/bruh_fox.jpg"
            />
        </div>

        <h1>Crash</h1>
        <p>The application has encontered a critical error that cannot handle it, so must be terminated.</p>

        <div className="crash-details">
            <p>Detailed error:</p>

            <code>
                {JSON.stringify(crash, null, 2)}
            </code>
        </div>
    </div>
}

export default Crash