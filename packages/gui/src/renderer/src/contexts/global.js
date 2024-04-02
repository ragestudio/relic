import React from "react"

const GlobalStateContext = React.createContext({
    pkg: {},
    packages: [],
})

export default GlobalStateContext