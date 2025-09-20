export default [
  {
    component: "SOFT_GROUP_BEGIN",
    label: "搜图配置"
  },
  {
    field: "picSearch.isMasterUse",
    label: "搜图主人独享",
    bottomHelpMessage: "搜图是否只有主人能用",
    component: "Switch"
  },
  {
    field: "picSearch.limit",
    label: "搜图次数限制",
    bottomHelpMessage: "每名用户每日次数限制（0 则无限制）",
    component: "InputNumber"
  },
  {
    field: "picSearch.allowPM",
    label: "搜图私聊使用",
    bottomHelpMessage: "搜图是否允许私聊使用",
    component: "Switch"
  },
  {
    field: "picSearch.cfTLSVersion",
    label: "TLS 版本",
    bottomHelpMessage: "绕过 Cloudflare Challenge 所使用的 TLS 版本，推荐 TLSv1.2",
    component: "Input"
  }
]
