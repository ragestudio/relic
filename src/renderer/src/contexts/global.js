import React from "react"

const GlobalStateContext = React.createContext({
    pkg: {},
    installations: [],
})

export default GlobalStateContext