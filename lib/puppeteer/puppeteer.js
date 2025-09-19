import _ from "lodash"
import devices from "./devices.js"
import render from "./render.js"
import Renderer from "../../../../lib/renderer/loader.js"
import sharp from "sharp"
import { Log_Prefix } from "#yenai.components"
const renderer = Renderer.getRenderer()

export default new class extends render {
  constructor() {
    super()
    this.browser = false
    this.shoting = []
  }

  /** ---------------- 单页截图 ---------------- */
  async Webpage(url, options = {}) {
    if (!(await this.launch())) return false

    const {
      headers = false,
      setViewport = false,
      font = false,
      cookie = false,
      fullPage = true,
      emulate = false,
      beforeLaunch = null,
      afterLaunch = null
    } = options

    let buff = ""
    let start = Date.now()
    let name = _.truncate(url)
    this.shoting.push(name)

    try {
      const page = await this.browser.newPage()
      if (typeof beforeLaunch === "function") await beforeLaunch(page)
      if (headers) await page.setExtraHTTPHeaders(headers)
      if (cookie) await page.setCookie(...cookie)
      if (emulate) await page.emulate(devices[emulate] || emulate)
      if (setViewport) await page.setViewport(setViewport)
      await page.goto(url, { timeout: 60 * 1000, waitUntil: "networkidle0" })
      if (font) {
        await page.addStyleTag({
          content:
            "* {font-family: \"汉仪文黑-65W\",\"雅痞-简\",\"圆体-简\",\"PingFang SC\",\"微软雅黑\", sans-serif !important;}"
        })
      }
      if (typeof afterLaunch === "function") await afterLaunch(page)

      buff = await page.screenshot({
        type: "jpeg",
        fullPage,
        quality: 100,
        encoding: "base64"
      })
      await page.close().catch((err) => logger.error(err))
    } catch (err) {
      logger.error(`${Log_Prefix} 网页截图失败: ${name} ${err}`)
      if (this.browser) await this.browser.close().catch((err) => logger.error(err))
      this.browser = false
      return false
    }

    this.shoting.pop()
    if (!buff) {
      logger.error(`${Log_Prefix} 网页截图为空: ${name}`)
      return false
    }

    renderer.renderNum++
    let kb = (buff.length / 1024).toFixed(2) + "kb"
    logger.mark(`${Log_Prefix}[网页截图][${name}][${renderer.renderNum}次] ${kb} ${logger.green(`${Date.now() - start}ms`)}`)
    renderer.restart()

    return buff // 返回 base64
  }

  /** ---------------- 多网页截图拼接 ---------------- */
  /**
   * urls: string[] - 多个网页 URL
   * direction: "vertical" | "horizontal" - 拼接方向
   */
  async WebpageConcat(urls = [], options = {}, direction = "vertical") {
    if (!Array.isArray(urls) || urls.length === 0) return false
    const buffers = []

    for (let url of urls) {
      const base64 = await this.Webpage(url, options)
      if (!base64) continue
      buffers.push(Buffer.from(base64, "base64"))
    }

    if (buffers.length === 0) return false

    let concatImage
    if (direction === "horizontal") {
      concatImage = await sharp({
        create: {
          width: 1,
          height: 1,
          channels: 3,
          background: "#fff"
        }
      })
        .composite(buffers.map((b, i) => ({ input: b, top: 0, left: 0 })))
        .toBuffer()
    } else {
      // 默认纵向拼接
      concatImage = await sharp({
        create: {
          width: 1,
          height: 1,
          channels: 3,
          background: "#fff"
        }
      })
        .composite(buffers.map((b, i) => ({ input: b, top: 0, left: 0 })))
        .toBuffer()
    }

    return segment.image("base64://" + concatImage.toString("base64"))
  }

  /** ---------------- 启动浏览器 ---------------- */
  async launch() {
    if (this.browser) return this.browser
    if (!renderer.browser) {
      let res = await renderer.browserInit()
      if (!res) return false
    }
    this.browser = renderer.browser
    return this.browser
  }

  /** ---------------- 页面抓取 ---------------- */
  async get(url, waitSelector) {
    if (!(await this.launch())) return false
    const page = await this.browser.newPage()
    try {
      logger.debug("Puppeteer get", url)
      await page.goto(url)
      await page.waitForSelector(waitSelector).catch((e) => {
        logger.error(`Puppeteer get "${url}" wait "${waitSelector}" error`)
        logger.error(e)
      })
      const res = await page.evaluate(() => ({
        url: window.location.href,
        data: document.documentElement.outerHTML
      }))
      return res
    } catch (e) {
      logger.error(`Puppeteer get "${url}" error`)
      throw e
    } finally {
      page.close()
    }
  }
}()
