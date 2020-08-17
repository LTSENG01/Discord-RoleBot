import {Application, Router, send} from "https://deno.land/x/oak/mod.ts"
import { Status } from "https://deno.land/x/oak/deps.ts";

const app = new Application()
const router = new Router()

const DEBUG = true

const DISCORD_API = "https://discord.com/api/oauth2/"
const CLIENT_ID = "742765861013553272"

const OAUTH_REDIRECT_URL = DEBUG ? "http://localhost:8000/auth" : "https://discord.ltseng.me/CICSRoleBot/auth"
const OAUTH_REDIRECT = DEBUG ? "http%3A%2F%2Flocalhost%3A8000%2Fauth" : "https%3A%2F%2Fdiscord.ltseng.me%2FCICSRoleBot%2Fauth"
const OAUTH_AUTH = `authorize?client_id=${CLIENT_ID}&redirect_uri=${OAUTH_REDIRECT}&response_type=code&scope=identify%20email%20guilds`
const OAUTH_TOKEN = "token"

interface AccessToken {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
    scope: string
}

let savedAccessToken: AccessToken

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
            client_secret: Deno.env.get("DISCORD_SECRET") ?? "",
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
        let accessToken = await result.json()
        console.log("Access Token: " + accessToken.access_token + " " + accessToken.expires_in)

        if (regex.test(accessToken.access_token)) {
            savedAccessToken = accessToken
            ctx.response.redirect("/dashboard.html")
        } else {
            ctx.response.status = Status.BadRequest
        }
    })
    .get("/dashboard", ctx => {
        console.log("DASHBOARD: " + savedAccessToken.access_token)
        ctx.response.body = "Dashboard."
    })
    .get("/save", async ctx => {
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
