import React from "react"

import * as MDIcons from "react-icons/md"
import * as SIIcons from "react-icons/si"

export const Icons = {
    ...MDIcons,
    ...SIIcons,
}

export const Icon = ({ icon }) => {
    if (icon && Icons[icon]) {
        return React.createElement(Icons[icon])
    }

    return <></>
}

export default Icons