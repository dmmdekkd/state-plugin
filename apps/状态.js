import { Config } from "../components/index.js"
import { getMonitorData, getData } from "../model/State/index.js"
import { puppeteer } from "../model/index.js"

let interval = false

export class NewState extends plugin {
  constructor() {
    const keyword = Config.state.keyword || "椰奶"
    const stateReg = new RegExp(`^#?(${keyword})?状态(pro)?(debug)?$`)
    
    super({
      name: "椰奶状态",
      event: "message",
      priority: -114514,
      rule: [
        { reg: stateReg, fnc: "state" },//  reg: "^#?(椰奶)?状态(pro)?(debug)?$",
        { reg: "^#椰奶监控$", fnc: "monitor" },
        { reg: "^#?原图酱$", fnc: "origImg" }
      ]
    })

    this.redisOrigImgKey = "yenai:state:origImg:"
  }

  /** 获取最新关键字正则 */
  getStateReg() {
    const keyword = Config.state.keyword || "椰奶"
    return new RegExp(`^#?(${keyword})?状态(pro)?(debug)?$`)
  }

  async monitor(e) {
    const data = await getMonitorData()
    await puppeteer.render("state/monitor", data, { e, scale: 1.4 })
  }

  async state(e) {
    const stateReg = this.getStateReg() // 每次动态获取最新关键字
    if (!stateReg.test(e.msg) && !Config.state.defaultState) return false
    if (e.msg.includes("pro") && Config.state.noPro) return false

    if (interval) return false
    interval = true
    try {
      const data = await getData(e)
      const retMsgId = await puppeteer.render("state/index", data, { e, scale: 1.4, retMsgId: true })

      if (retMsgId) this._saveMsgId(e, retMsgId, data)
    } catch (error) {
      logger.error(error)
    } finally {
      interval = false
    }
  }

  async origImg(e) {
    const message_id = e.reply_id || (e.source
      ? (e.group?.getChatHistory
          ? (await e.group.getChatHistory(e.source.seq, 1))[0].message_id
          : (await e.friend.getChatHistory(e.source.time, 1))[0].message_id
        )
      : false)
    if (!message_id) return false
    const data = await redis.get(this.redisOrigImgKey + message_id)
    if (!data) return false
    e.reply(segment.image(data))
    return true
  }

  _saveMsgId(e, retMsgId, data) {
    const redisData = data.style.backdrop
    const message_id = [ e.message_id ]
    if (Array.isArray(retMsgId.message_id)) message_id.push(...retMsgId.message_id)
    else message_id.push(retMsgId.message_id)

    for (const i of message_id) {
      redis.set(this.redisOrigImgKey + i, this._handleImgData(redisData), { EX: 60 * 60 * 2 })
    }
  }

  _handleImgData(data) {
    return data.replace("data:image/jpeg;base64,", "base64://").replace("../../../../../", "")
  }
}
