import { Config, YamlReader, Plugin_Path } from "../../components/index.js"
import _ from "lodash"
import state from "./state.js"
import picSearch from "./picSearch.js"
import proxy from "./proxy.js"
import other from "./other.js"

export const schemas = [
  ...state,
  ...proxy,
  ...picSearch,
  ...other
]

export function getConfigData() {
  return {
    state: Config.state,
    proxy: Config.proxy,
    picSearch: Config.picSearch,
    other: Config.other
  }
}

export function setConfigData(data, { Result }) {
  const dataMap = convertToNestedObject(data)

  for (let key of ["state", "proxy", "picSearch", "other"]) {
    if (dataMap[key]) {
      const path = `${Plugin_Path}/config/config/${key}.yaml`
      const y = new YamlReader(path)
      y.setData(dataMap[key])
    }
  }

  return Result.ok({}, "保存成功辣ε(*´･ω･)з")
}

function convertToNestedObject(data) {
  const result = {}

  for (const key in data) {
    if (Object.hasOwn(data, key)) {
      const keys = key.split(".")
      let obj = result
      keys.forEach((k, index) => {
        if (index === keys.length - 1) obj[k] = data[key]
        else { obj[k] = obj[k] || {}; obj = obj[k] }
      })
    }
  }

  return result
}
