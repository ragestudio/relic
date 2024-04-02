import React from "react"

import "./index.less"

const Timestamp = ({ timestamp }) => {
    if (isNaN(timestamp)) {
        return <span className="timestamp">{timestamp}</span>
    }

    return <span
        className="timestamp"
    >
        {
            new Date(timestamp).toLocaleString().split(", ").join("|")
        }
    </span>
}

const LogEntry = ({ log }) => {
    return <div className="log-entry">
        <span className="line_indicator">
            {">"}
        </span>

        {log.timestamp && <Timestamp timestamp={log.timestamp} />}

        {!log.timestamp && <span className="timestamp">- no timestamp -</span>}

        <p>
            {log.message ?? "No message"}
        </p>
    </div>
}

const LogsViewer = () => {
    const listRef = React.useRef()
    const [timeline, setTimeline] = React.useState([])

    const events = {
        "logger:new": (event, log) => {
            setTimeline((timeline) => [...timeline, log])

            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }

    React.useEffect(() => {
        for (const event in events) {
            ipc.exclusiveListen(event, events[event])
        }
    }, [])

    return <div
        className="app-logs"
        ref={listRef}
    >
        {
            timeline.length === 0 && <p>No logs</p>
        }

        {
            timeline.map((log) => <LogEntry key={log.id} log={log} />)
        }
    </div>
}

export default LogsViewer