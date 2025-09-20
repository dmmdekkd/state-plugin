import { Config } from "../../components/index.js"
import { common } from "../../model/index.js"
import { getStatus, checkNumberValue, sendImg } from "./_utils.js"

const indexCfgTypeMap = {
  状态: {
    key: "state.defaultState",
    toString() {
      return this.key
    }
  },
  渲染精度: {
    type: "number",
    key: "other.renderScale",
    limit: "50-200",
    toString() {
      return this.key
    }
  }
}

// 支持 #椰奶设置状态前缀 新前缀
const indexCfgReg = new RegExp(`^#椰奶设置(${Object.keys(indexCfgTypeMap).join("|")}|前缀)(开启|关闭|(\\d+)秒?|\\s.+)?$`)

export class Admin_Index extends plugin {
  constructor() {
    super({
      name: "椰奶配置-index",
      event: "message",
      priority: 100,
      rule: [
        { reg: indexCfgReg, fnc: "indexSet" },
        { reg: "^#椰奶设置$", fnc: "sendImg" }
      ]
    })
  }

  async indexSet(e) {
    if (!common.checkPermission(e, "master")) return

    let regRet = indexCfgReg.exec(e.msg)
    if (!regRet) return
    const rawkey = regRet[1]
    let value = regRet[2] ? regRet[2].trim() : ""

    if (rawkey === "前缀") {
      // 修改状态前缀，重启生效
      if (!value) return e.reply("请提供新的状态前缀，例如：#椰奶设置状态前缀 新前缀")
      Config.modify("state", "keyword", value)
      // 修改后返回配置图片
      return this.sendImg(e)
    }

    // 普通配置处理
    let _key = indexCfgTypeMap[rawkey]
    let [ file, ...key ] = _key.toString().split(".")
    key = key.join(".")

    if (typeof _key === "object") {
      if (_key.type === "number") {
        if (!regRet[3]) return
        value = checkNumberValue(regRet[3])
      } else {
        value = value === "开启"
      }
    } else {
      if (!/(开启)|(关闭)/.test(value)) return
      value = value === "开启"
    }

    Config.modify(file, key, value)
    this.sendImg(e)
  }

  async sendImg(e) {
    let data = this.getIndexSetData()
    return sendImg(e, data)
  }

  getIndexSetData() {
    return {
      label: "#椰奶设置",
      list: {
        系统设置: [
          {
            key: "椰奶作为默认状态",
            value: getStatus(Config.state.defaultState),
            hint: "#椰奶设置状态 + 开启/关闭",
            desc: "开启后将使用椰奶版状态作为yunzai的默认状态"
          },
          {
            key: "渲染精度",
            value: getStatus(Config.other.renderScale),
            hint: "#椰奶设置渲染精度100",
            desc: "可选值50~200，建议100。设置高精度会提高图片的精细度，但因图片较大可能会影响渲染与发送速度"
          },
          {
            key: "状态前缀",
            value:  getStatus(Config.state.keyword) || "椰奶",
            hint: `椰奶设置前缀 新前缀`,
            desc: "修改状态命令触发前缀，修改后需要重启插件或机器人才能生效"
          }
        ]
      }
    }
  }
}
