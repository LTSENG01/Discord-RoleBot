
async function getUserInfo() {
    console.log("Getting user info.")
    let response = await fetch("/identity", {
        method: "POST"
    })
    if (response.status === 401) {
        // Show message as a Bootstrap alert, redirect in __ seconds.
        redirectBrowser("/login")
    }
    return await response.json()
}

async function getRoleInfo() {
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

async function getUserAvatar(user_id, avatar_id) {
    let path = `avatars/${user_id}/${avatar_id}.png`
    let image = await fetch(`/images/${path}`)
    return await image.text()
}

async function getGuildAvatar(guild_id, icon_id) {
    let path

    // checks if the icon is animated or not
    if (/^a_/.test(icon_id)) {
        path = `icons/${guild_id}/${icon_id}.gif`
    } else {
        path = `icons/${guild_id}/${icon_id}.png`
    }
    let image = await fetch(`/images/${path}`)
    return await image.text()
}

function redirectBrowser(location) {
    window.location.replace(location)
}

window.onload = async function() {
    console.log(await getUserInfo())
    console.log(await getRoleInfo())
    let imageURL = await getGuildAvatar("574287921717182505", "a_5addd83a4328a1a9772c53d1e6c18978")
    document.getElementById("guild-icon").setAttribute("src", imageURL)
}
