import _ from "lodash"
import { Config, Log_Prefix } from "#yenai.components"

export default new class {
  /**
   * 延时函数
   * @param {number} ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取状态配置
   * @returns {object} state 配置
   */
  getStateConfig() {
    return Config.state
  }

  /**
   * 判断对象或数组是否为空（状态检查常用）
   * @param {object|Array} data
   * @param {Array} omits - 忽略字段
   * @returns {boolean}
   */
  checkIfEmpty(data, omits = []) {
    const filteredData = _.omit(data, omits)
    return _.every(filteredData, (value) =>
      _.isPlainObject(value) ? this.checkIfEmpty(value) : _.isEmpty(value)
    )
  }

  /**
   * 检查用户权限
   * @param {object} e - 消息事件
   * @param {string} level - 权限等级: master/admin
   * @returns {boolean}
   */
  checkPermission(e, level = 'master') {
    if (level === 'master') return e.isMaster
    if (level === 'admin') return e.isAdmin || e.isMaster
    return false
  }

  /**
   * 处理异常并返回错误消息（状态操作异常捕获）
   * @param {object} e - 消息事件
   * @param {Error} ErrorObj - 异常对象
   * @param {object} options - 可选参数
   * @param {string} options.MsgTemplate - 自定义错误模板
   */
  handleException(e, ErrorObj, { MsgTemplate } = {}) {
    if (!(ErrorObj instanceof Error)) return false
    let ErrMsg = ErrorObj.stack || ErrorObj.message
    ErrMsg = MsgTemplate ? MsgTemplate.replace(/{error}/g, ErrMsg) : ErrMsg
    return e.reply(ErrMsg)
  }
}()
