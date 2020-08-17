import { Application, Router, send } from "https://deno.land/x/oak/mod.ts"

const app = new Application()
const router = new Router()

const DEBUG = true

const DISCORD_API = "https://discord.com/api/oauth2/"
const CLIENT_ID = "742765861013553272"

const OAUTH_REDIRECT = DEBUG ? "http%3A%2F%2Flocalhost%3A8000%2Fauth" : "https%3A%2F%2Fdiscord.ltseng.me%2FCICSRoleBot%2Fauth"
const OAUTH_AUTH = `authorize?client_id=${CLIENT_ID}&redirect_uri=${OAUTH_REDIRECT}&response_type=code&scope=identify%20email%20guilds`
const OAUTH_TOKEN = "token"

router
    .get("/login", ctx => {
        ctx.response.redirect(DISCORD_API + OAUTH_AUTH)
    })
    .get("/auth", ctx => {
        // parse response from Discord API authorization (30 char alphanumerical)
        let regex = /^[A-Za-z0-9]{30}$/
        let code = ctx.request.url.searchParams.get("code")

        let check = regex.test(code ?? "")
        console.log("AUTH: code=" + code + " CHECK: " + check)

        // let data = {
        //     client_id: CLIENT_ID,
        //     client_secret: Deno.env.get("DISCORD_SECRET"),
        //     grant_type: 'authorization_code',
        //     code: code,
        //     redirect_uri: OAUTH_REDIRECT,
        //     scope: 'identify email guilds'
        // }
        //
        // let headers = {
        //     'Content-Type': 'application/json'
        // }

        // // exchange authorization token for access token
        // fetch(DISCORD_API + OAUTH_TOKEN, {
        //     method: "POST",
        //     body: JSON.stringify(data),
        //     headers: headers
        // }).then(r => {
        //     console.log("Success")
        //     console.log(r.text())
        // }).catch(err => {
        //     console.log(err)
        // })
    })
    .get("/save", ctx => {
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
