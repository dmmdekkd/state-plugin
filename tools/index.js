import formatDuration from "./formatDuration.js"



/**
 * 延时函数
 * @param {*} ms 时间(毫秒)
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export { formatDuration, sleep }
