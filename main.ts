import { Application, Router, RouterContext, send, Status } from "./deps.ts"

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const app = new Application()
const router = new Router()

const DEBUG = false
const TEST_GUILD = false

const DISCORD_API = "https://discord.com/api/"
const DISCORD_CDN = "https://cdn.discordapp.com/"

const CLIENT_ID = "742765861013553272"

const CLIENT_SECRET = Deno.env.get("DISCORD_SECRET") ?? ""
const BOT_SECRET = Deno.env.get("BOT_SECRET") ?? ""

const OAUTH_REDIRECT_URL = DEBUG ? "http://localhost:8000/auth" : "https://discord.ltseng.me/auth"
const OAUTH_REDIRECT = DEBUG ? "http%3A%2F%2Flocalhost%3A8000%2Fauth" : "https%3A%2F%2Fdiscord.ltseng.me%2Fauth"
const OAUTH_AUTH = `oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${OAUTH_REDIRECT}&response_type=code&scope=identify%20guilds`
const OAUTH_TOKEN = "oauth2/token"

const GUILD_INFO = {
    id: !TEST_GUILD ? "574287921717182505" : "696781447444299826",
    icon: "a_5addd83a4328a1a9772c53d1e6c18978"
}

const restrictedRegex = /(server|verified|@everyone|umass cics|cics role bot|admin|moderator|professor|uca|\bta\b|----)/i
const identityRegex = /^(he\/him|she\/her|they\/them|ze\/hir)/i
const graduationRegex = /^(alumni|graduate student|class of \d{4}|international)/i
const residenceRegex = /^(zoomer|central|ohill|northeast|southwest|honors|sylvan|off-campus|rap data science|rap ethics society)/i
const csCoursesRegex = /^(cs|cics|info)/i
const mathCoursesRegex = /^(math|stat)/i
const interdisciplinaryCoursesRegex = /^(business|biology|economics|engineering|linguistics|psychology|informatics|physics|chemistry)/i
const hobbiesRegex = /^(personal projects|hardware|video games|personal finance|music|travel)/i
const miscellaneousRegex = /^(snooper|daily coding problems|community events)/i

const regexArray = [restrictedRegex, identityRegex, graduationRegex, residenceRegex, csCoursesRegex, mathCoursesRegex,
    interdisciplinaryCoursesRegex, hobbiesRegex, miscellaneousRegex]

const categoryArray = ["restricted", "identity", "graduation", "residence", "cS_Courses", "math_Courses",
    "interdisciplinary_Courses", "hobbies", "miscellaneous"]

interface AccessToken {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
    scope: string
}

interface User {
    id: string,
    username: string,
    avatar: string,
    discriminator: string,
    inCorrectGuild: boolean
}

interface Role {
    id: string,
    name: string,
    color: number,
    priority: number,
    category: string | undefined
}

interface Guild {
    id: string,
    name: string,
    icon: string,
    owner: false,
    permissions: number,
    features: string[],
    permissions_new: string
}

function determineRoleCategory(name: string): string {
    for (const index in regexArray) {
        if (regexArray[index].test(name)) {
            return categoryArray[index]
        }
    }
    return ""   // returns an empty string if there is no role
}

async function getRoles() {
    // requires Bot authorization
    let response = await fetch(DISCORD_API + "guilds/" + GUILD_INFO.id + "/roles", {
        headers: {
            'Authorization': "Bot " + BOT_SECRET
        }
    })

    // remove unnecessary role metadata
    let json = await response.json()
    return json.map((item: any) => {
        return {
            id: item.id,
            name: item.name,
            color: item.color,
            priority: item.position,
            category: determineRoleCategory(item.name)
        }
    })
}

/**
 *
 * @param ctx
 * @return string
 */
async function getIdentity(ctx: RouterContext) {
    let accessToken = ctx.cookies.get("discord-access-token") ?? ""

    let identity = await fetch(DISCORD_API + "users/@me", {
        headers: {
            'Authorization': "Bearer " + accessToken
        }
    })
    if (identity.status === 401) {
        ctx.response.status = Status.Unauthorized
    }

    let guilds = await fetch(DISCORD_API + "users/@me/guilds", {
        headers: {
            'Authorization': "Bearer " + accessToken
        }
    })
    if (guilds.status === 401) {
        ctx.response.status = Status.Unauthorized
    }

    let userInfo = await identity.json()
    let guildInfo: Guild[] = await guilds.json()

    let inCorrectGuild = (guildsArray: Guild[], guildID: string) => {
        return guildsArray.filter(guild => guild["id"] === guildID).length > 0
    }

    let user: User = {
        id: userInfo.id,
        username: userInfo.username,
        avatar: userInfo.avatar,
        discriminator: userInfo.discriminator,
        inCorrectGuild: inCorrectGuild(guildInfo, GUILD_INFO.id)
    }

    return JSON.stringify(user)
}

router
    .get("/login", ctx => {
        ctx.response.redirect(DISCORD_API + OAUTH_AUTH)
    })
    .get("/auth", async ctx => {
        // parse response from Discord API authorization (30 char alphanumerical)
        let regex = /^[A-Za-z0-9]{30}$/
        let code = ctx.request.url.searchParams.get("code") ?? ""

        let check = regex.test(code)
        console.log("AUTH: code=" + code + " CHECK: " + check)

        let data = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: OAUTH_REDIRECT_URL,
            scope: 'identify email guilds'
        })

        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        console.log("Exchanging auth grant for access token")
        // exchange authorization grant for access token
        let result = await fetch(DISCORD_API + OAUTH_TOKEN, {
            method: "POST",
            body: data,
            headers: headers
        })

	console.log(result.status)
	console.log(result.statusText)

        let accessToken: AccessToken = await result.json()
        console.log("Access Token: " + accessToken.access_token + " " + accessToken.expires_in)

        if (regex.test(accessToken.access_token)) {
            ctx.cookies.set("discord-access-token", accessToken.access_token)
            ctx.cookies.set("discord-token-expiration", Date.now().toString())  // todo cookie math
            ctx.response.redirect("/dashboard.html")
        } else {
            ctx.response.status = Status.BadRequest
        }
    })
    .post("/identity", async ctx => {
        ctx.response.body = await getIdentity(ctx)
    })
    .get("/images/:path*", async ctx => {
        if (ctx.params && ctx.params.path) {
            console.log("Fetching image: " + ctx.params.path)
            ctx.response.body = DISCORD_CDN + ctx.params.path
        }
    })
    .get("/userroles/:userid", async ctx => {
        if (ctx.params && ctx.params.userid) {
            console.log("Fetching user roles: " + ctx.params.userid)

            let response = await fetch(DISCORD_API + "guilds/" + GUILD_INFO.id + "/members/" + ctx.params.userid, {
                headers: {
                    'Authorization': "Bot " + BOT_SECRET
                }
            })

            ctx.response.body = await response.json()
        }
    })
    .post("/roles", async ctx => {
        ctx.response.body = await getRoles()
    })
    .post("/save", async ctx => {
        interface SavePayload {
            userID: string,
            rolesToAdd: string[],
            rolesToRemove: string[]
        }

        console.log("/save")

        // Grab latest copy of all roles
        let roles = await getRoles()

        const payload = ctx.request.body()
        if (payload.type == "json") {
            let savePayload: SavePayload = await payload.value

	        // verify identity (make sure user is properly authenticated)
            let identityResponse = await getIdentity(ctx)
            let identity = JSON.parse(identityResponse).id

            if (identity !== savePayload.userID) {
                ctx.response.status = Status.Unauthorized
                return
            }

            // sanitize roles (remove restricted roles)
            savePayload.rolesToAdd = savePayload.rolesToAdd.filter(roleID => {
                return !roles.some((role: Role) => role.category === "restricted" && role.id === roleID)
            })

            savePayload.rolesToRemove = savePayload.rolesToRemove.filter(roleID => {
                return !roles.some((role: Role) => role.category === "restricted" && role.id === roleID)
            })

            if (savePayload.rolesToAdd.length === 0 && savePayload.rolesToRemove.length === 0) {
                ctx.response.status = Status.UnprocessableEntity
                return
            }

            console.log("USER: " + savePayload.userID)
            console.log("ADD: " + savePayload.rolesToAdd)
            console.log("REMOVE: " + savePayload.rolesToRemove)

            const roleAPI = `guilds/${GUILD_INFO.id}/members/${savePayload.userID}/roles/` // /{role.id}

            // assign roles
            for (const roleID of savePayload.rolesToAdd) {
                console.log("Waiting...")
                await wait(1000)

                fetch(DISCORD_API + roleAPI + roleID, {
                    headers: {
                        'Authorization': "Bot " + BOT_SECRET
                    },
                    method: "PUT"
                }).then(res => {
                    console.log(res.status)
                    if (res.status === 429) {
                        // rate limited
                    }
                }).catch(err => {
                    console.error(err)
                    ctx.response.status = Status.ServiceUnavailable
                    return
                })
            }

            // remove roles
            for (const roleID of savePayload.rolesToRemove) {
                await wait(1000)
                fetch(DISCORD_API + roleAPI + roleID, {
                    headers: {
                        'Authorization': "Bot " + BOT_SECRET
                    },
                    method: "DELETE"
                }).then(res => {
                    console.log(res.status)
                    if (res.status === 429) {
                        // rate limited
                    }
                }).catch(err => {
                    console.error(err)
                    ctx.response.status = Status.ServiceUnavailable
                    return
                })
            }

            console.log("SAVE: " + payload)
            ctx.response.status = Status.OK
        } else {
            console.error("Bad payload received. " + payload.type)
            ctx.response.status = Status.UnprocessableEntity
        }
    })
    .get("/logout", ctx => {
        ctx.cookies.delete("discord-access-token")
        ctx.response.redirect("/")
    })

app.use(router.routes())
app.use(router.allowedMethods())

app.use(async ctx => {
    // ctx.response.headers.set('Cache-Control', 'max-age=604800')
    console.log("Static: " + ctx.request.url.pathname)
    await send(ctx, ctx.request.url.pathname, {
        root: DEBUG ? `${Deno.cwd()}/static` : "/root/git/Discord-RoleBot/static",
        index: "index.html",
    })
})

console.log(`🦕 Deno server running at http://localhost:8000/ 🦕`)
await app.listen({ port: 8000 })
