import cfg from "../../../../lib/config/config.js"
import PluginsLoader from "../../../../lib/plugins/loader.js"
import moment from "moment"

class StatusPlugin extends plugin {
  constructor() {
    super({
      name: "状态统计",
      dsc: "#状态",
      event: "message",
      priority: 0,
      rule: [] // 不使用正则匹配
    })
  }

  /** 返回 JSON 状态，不发送消息 */
  async getStatusJson() {
    try {
      const basicInfo = await this.getBasicInfo()
      const botTimes = await this.getBotTimeJson()
      const pluginTimes = await this.getPluginTimeJson()
      const messageStats = await this.getCountJsonSafe()
      return { basicInfo, botTimes, pluginTimes, messageStats }
    } catch (err) {
      return { error: err.message }
    }
  }

  /** 基础信息 */
  async getBasicInfo() {
    return {
      version: cfg.package.version,
      uptime: Bot.getTimeDiff(),
      memoryMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
      system: `${process.platform} ${process.arch} ${process.version}`
    }
  }

  /** Bot 在线时长（JSON） */
  async getBotTimeJson() {
    const arr = []
    for (const i of Bot.uin || []) {
      if (Bot[i]?.stat?.start_time) {
        arr.push({
          id: i,
          uptime: Bot.getTimeDiff(Bot[i].stat.start_time * 1000),
          startTime: Bot[i].stat.start_time
        })
      }
    }
    return arr
  }

  /** 插件加载用时（JSON） */
  async getPluginTimeJson() {
    const arr = []
    const loadTime = PluginsLoader.load_time || {}
    for (const name in loadTime) {
      const parts = name.split('/') // 拆分路径
      const path = parts.slice(0, -1).join('/') // 目录部分
      const file = parts.slice(-1)[0]            // 文件名部分
      arr.push({
        fullName: name,
        path,
        file,
        time: loadTime[name]
      })
    }
    return arr
  }
  

async getCountJsonSafe(cmd = {}) {
    try {
      // --- 日期处理 ---
      const dateArray = []
      if (cmd["日期"]) {
        const raw = cmd["日期"].replace(/[^\d]/g, "")
        switch (raw.length) {
          case 8: // YYYYMMDD
            dateArray.push([raw.slice(0, 4), raw.slice(4, 6), raw.slice(6, 8)])
            break
          case 4: // MMDD
            dateArray.push([moment().format("YYYY"), raw.slice(0, 2), raw.slice(2, 4)])
            break
          case 2: // DD
            dateArray.push([moment().format("YYYY"), moment().format("MM"), raw])
            break
          default:
            return { error: `日期格式错误：${cmd["日期"]}` }
        }
      } else {
        const d = moment()
        for (let i = 0; i < 3; i++) {
          dateArray.push(d.format("YYYY MM DD").split(" "))
          d.add(-86400000)
        }
        dateArray.push([d.format("YYYY"), d.format("MM")], [d.format("YYYY")], ["total"])
      }
  
      // --- 消息名称 ---
      const msgName = cmd["消息"] || "msg"
  
      // --- 构建目标数组（默认全局添加机器人/用户/群） ---
      const array = []
  
      // 1. cmd 里指定的优先添加
      if (cmd["机器人"]) array.push({ text: "机器人", key: `bot`, id: cmd["机器人"], type: 'bot' })
      if (cmd["用户"]) array.push({ text: "用户", key: `user`, id: cmd["用户"], type: 'user' })
      if (cmd["群"]) array.push({ text: "群", key: `group`, id: cmd["群"], type: 'group' })
  
      // 2. 默认全局添加
      if (!array.find(i => i.type === 'bot') && this.e?.self_id)
        array.push({ text: "机器人", key: `bot`, id: this.e.self_id, type: 'bot' })
      if (!array.find(i => i.type === 'user') && this.e?.user_id)
        array.push({ text: "用户", key: `user`, id: this.e.user_id, type: 'user' })
      if (!array.find(i => i.type === 'group') && this.e?.group_id)
        array.push({ text: "群", key: `group`, id: this.e.group_id, type: 'group' })
  
      // 3. 默认统计总计 / 用户量 / 群量
      array.push(
        { text: `${msgName} 消息统计`, key: "total" },
        { type: "keys", text: "用户量", key: "user:*" },
        { type: "keys", text: "群量", key: "group:*" }
      )
  
      // --- 获取 Redis 数据 ---
      const result = []
      for (const target of array) {
        if (target.id) target.key += `:${target.id}`
  
        const record = { text: target.text, key: target.key, id: target.id || null, stats: [] }
        for (const d of dateArray) {
          let dateStr = d.join("-")
          if (dateStr === "total") dateStr = "总计"
  
          const key = `:${msgName}:${target.key}:${d.join(":")}`
          const redisData = await this.redisSafe(target.type, key)
          record.stats.push({ date: dateStr, receive: redisData.receive, send: redisData.send })
        }
        result.push(record)
      }
  
      return result
    } catch (err) {
      return { error: err.message }
    }
  }
  
  

  /** Redis 安全获取 */
  async redisSafe(type, key) {
    const ret = {}
    try {
      for (const i of ["receive", "send"]) {
        const k = `Yz:count:${i}${key}`
        if (type === "keys") ret[i] = (await this.redisKeysLengthSafe(k)) || 0
        else ret[i] = (await redis.get(k)) || 0
      }
    } catch {
      ret.receive = 0
      ret.send = 0
    }
    return ret
  }

  /** Redis keys 长度安全获取 */
  async redisKeysLengthSafe(MATCH) {
    let cursor = 0, length = 0
    try {
      do {
        const reply = await redis.scan(cursor, { MATCH, COUNT: 10000 })
        cursor = reply.cursor
        length += reply.keys.length
      } while (cursor !== 0)
    } catch {
      return 0
    }
    return length
  }
}

export default new StatusPlugin()
