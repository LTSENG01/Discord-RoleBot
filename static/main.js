async function getGuildAvatar(guildID, iconID) {
    console.log("Getting guild icon.")
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

window.onload = async function() {
    let guildImageURL = await getGuildAvatar("574287921717182505", "a_5addd83a4328a1a9772c53d1e6c18978")
    document.getElementById("guild-icon").setAttribute("src", guildImageURL)
}
