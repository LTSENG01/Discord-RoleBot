import { Application, Router, send } from "https://deno.land/x/oak/mod.ts"
import { Status } from "https://deno.land/x/oak/deps.ts";

const app = new Application()
const router = new Router()

const DEBUG = true

const DISCORD_API = "https://discord.com/api/"
const DISCORD_CDN = "https://cdn.discordapp.com/"

const CLIENT_ID = "742765861013553272"

const CLIENT_SECRET = Deno.env.get("DISCORD_SECRET") ?? ""
const BOT_SECRET = Deno.env.get("BOT_SECRET") ?? ""

const OAUTH_REDIRECT_URL = DEBUG ? "http://localhost:8000/auth" : "https://discord.ltseng.me/CICSRoleBot/auth"
const OAUTH_REDIRECT = DEBUG ? "http%3A%2F%2Flocalhost%3A8000%2Fauth" : "https%3A%2F%2Fdiscord.ltseng.me%2FCICSRoleBot%2Fauth"
const OAUTH_AUTH = `oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${OAUTH_REDIRECT}&response_type=code&scope=identify%20email%20guilds`
const OAUTH_TOKEN = "oauth2/token"

const GUILD_INFO = {
    id: !DEBUG ? "574287921717182505" : "696781447444299826",
    icon: "a_5addd83a4328a1a9772c53d1e6c18978"
}

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
    inCICSGuild: boolean
}

interface Role {
    id: string,
    name: string,
    color: number
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
        let accessToken = ctx.cookies.get("discord-access-token") ?? ""
        let identity = await fetch(DISCORD_API + "users/@me", {
            headers: {
                'Authorization': "Bearer " + accessToken
            }
        })
        if (identity.status === 401) {
            ctx.response.status = Status.Unauthorized
        }
        ctx.response.body = await identity.text()
    })
    .get("/images/:path*", async ctx => {
        if (ctx.params && ctx.params.path) {
            console.log("Fetching image: " + ctx.params.path)
            ctx.response.body = DISCORD_CDN + ctx.params.path
        }
    })
    .post("/roles", async ctx => {
        // requires Bot authorization
        // need to do server-side validation to prevent bad role assignment todo
        let response = await fetch(DISCORD_API + "guilds/" + GUILD_INFO.id + "/roles", {
            headers: {
                'Authorization': "Bot " + BOT_SECRET
            }
        })

        // remove unnecessary role metadata
        let json = await response.json()
        let roles: Role[] = json.map((item: any) => {
            return {
                id: item.id,
                name: item.name,
                color: item.color
            }
        })

        // remove useless and restricted roles --> function
        const restrictedRegex = /(server|verified|@everyone|umass cics|cics role bot|admin|----)/i
        let unrestrictedRoles = roles.filter(role => !restrictedRegex.test(role.name))

        const identityRegex = /^(he\/him|she\/her|they\/them|ze\/hir)/i
        const graduationRegex = /^(alumni|graduate student|class of \d{4})/i
        const residenceRegex = /^(zoomer|central|ohill|northeast|southwest|honors|sylvan|off-campus|rap data science|rap ethics society)/i
        const csCoursesRegex = /^(cs|cics|info)/i
        const mathCoursesRegex = /^(math|stat)/i
        const interdisciplinaryCoursesRegex = /^(business|biology|economics|engineering|linguistics|psychology|informatics|physics)/i
        const hobbiesRegex = /^(projects|hardware|video games|finance|music|travel)/i
        const miscellaneousRegex = /^(snooper|daily coding problems|community events)/i

        // organize roles into categories
        let organizedRoles = {
            identity: unrestrictedRoles.filter(role => identityRegex.test(role.name)),
            graduation: unrestrictedRoles.filter(role => graduationRegex.test(role.name)),
            residence: unrestrictedRoles.filter(role => residenceRegex.test(role.name)),
            csCourses: unrestrictedRoles.filter(role => csCoursesRegex.test(role.name)),
            mathCourses: unrestrictedRoles.filter(role => mathCoursesRegex.test(role.name)),
            interdisciplinaryCourses: unrestrictedRoles.filter(role => interdisciplinaryCoursesRegex.test(role.name)),
            hobbies: unrestrictedRoles.filter(role => hobbiesRegex.test(role.name)),
            miscellaneous: unrestrictedRoles.filter(role => miscellaneousRegex.test(role.name))
        }

        ctx.response.body = organizedRoles
    })
    .post("/save", async ctx => {
        let params = ctx.request.url.searchParams
        console.log("SAVE: " + params)
    })

app.use(router.routes())
app.use(router.allowedMethods())

app.use(async ctx => {
    await send(ctx, ctx.request.url.pathname, {
        root: `${Deno.cwd()}/static`,
        index: "index.html",
    })
})

console.log(`🦕 Deno server running at http://localhost:8000/ 🦕`)
await app.listen({ port: 8000 })
