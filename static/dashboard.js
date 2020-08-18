
async function getUserInfo() {
    console.log("Getting user info.")
    let response = await fetch("/identity", {
        method: "POST"
    })
    if (response.status === 401) {
        // Show message as a Bootstrap alert, redirect in __ seconds.
        redirectBrowser("/")
    }
    return await response.json()
}

async function getRoles() {
    console.log("Getting role info.")
    let response = await fetch("/roles", {
        method: "POST"
    })
    if (response.status === 401) {
        // Show message as a Bootstrap alert, redirect in __ seconds.
        redirectBrowser("/login")
    }
    return await response.json()
}

async function getUserRoles(userID) {
    console.log("Getting user roles.")
    let response = await fetch(`/userroles/${userID}`)
    return (await response.json())["roles"]
}

async function getUserAvatar(userID, avatarID) {
    let path = `avatars/${userID}/${avatarID}.png`
    let image = await fetch(`/images/${path}`)
    return await image.text()
}

async function getGuildAvatar(guildID, iconID) {
    let path

    // checks if the icon is animated or not
    if (/^a_/.test(iconID)) {
        path = `icons/${guildID}/${iconID}.gif`
    } else {
        path = `icons/${guildID}/${iconID}.png`
    }
    let image = await fetch(`/images/${path}`)
    return await image.text()
}

function redirectBrowser(location) {
    window.location.replace(location)
}

function decimalToRGB(number) {
    const r = (number & 0xff0000) >> 16
    const g = (number & 0x00ff00) >> 8
    const b = (number & 0x0000ff)

    let normalizedColor
    if (r === 0 && g === 0 && b === 0) {
        normalizedColor = [80, 80, 80]
    } else {
        normalizedColor = [r-10, g-10, b-10]
    }

    return normalizedColor
}

function generateRoleTemplate(role, endChar) {
    const colorArray = decimalToRGB(role.color)
    const color = `rgb(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]})`

    return `
        <div class="role" style="border-color: ${color}; background-color: ${color}" 
            id="${role.name}">${role.name} <strong>${endChar}</strong></div>
    `
}

function generateCategoriesAndRoles(rolesObject) {
    let categories = Object.keys(rolesObject)

    let rolesForCategory = (category) => {
        return rolesObject[category]
    }

    let categoryCollection = ""
    categories.map(category => {
        if (category === "restricted" || category === "all") {
            return
        }

        // Uppercase the first character, add a space for every underscore
        const normalizedHeader = category.charAt(0).toUpperCase() + category.replaceAll("_", " ").slice(1)

        let roleCollection = ""
        rolesForCategory(category).map(role => {
            roleCollection += generateRoleTemplate(role, "+")
        })

        const categoryTemplate = `
            <div class="card">
                <div class="card-header" id="${category}-roles-header">
                    <h2 class="mb-0">
                        <button class="btn btn-block text-left" type="button" data-toggle="collapse"
                                data-target="#collapse-${category}-roles" aria-expanded="true" aria-controls="collapse-${category}-roles">
                            ${normalizedHeader} Roles
                        </button>
                    </h2>
                </div>
                <div class="collapse show" id="collapse-${category}-roles" aria-labelledby="${category}-roles-header">
                    <div class="card-body" id="${category}-roles-container">
                        ${roleCollection}
                    </div>
                </div>
            </div>
        `

        categoryCollection += categoryTemplate
    })

    return categoryCollection
}

function lookupRole(roles, roleID) {
    return roles.find(role => role.id === roleID)
}

function generateCurrentRoles(roles, userRoles) {
    let allRoles = roles["all"];
    let roleCollection = ""

    let matchingRoles = userRoles.map(roleID => lookupRole(allRoles, roleID))
    let orderedRoles = matchingRoles.sort((a, b) => b.priority - a.priority)

    console.log(orderedRoles)

    orderedRoles.map(role => {
        roleCollection += generateRoleTemplate(role, "x")
    })

    return roleCollection
}

window.onload = async function() {
    let userInfo = await getUserInfo()
    let roles = await getRoles()
    let userRoles = await getUserRoles(userInfo.id)
    let userImageURL = await getUserAvatar(userInfo.id, userInfo.avatar)
    let guildImageURL = await getGuildAvatar("574287921717182505", "a_5addd83a4328a1a9772c53d1e6c18978")

    document.getElementById("username").innerText = userInfo.username + "#" + userInfo.discriminator
    document.getElementById("avatar-icon").setAttribute("src", userImageURL)
    document.getElementById("guild-icon").setAttribute("src", guildImageURL)

    document.getElementById("current-roles-container").innerHTML = generateCurrentRoles(roles, userRoles)
    document.getElementById("assignable-roles-accordion").innerHTML = generateCategoriesAndRoles(roles)

}
