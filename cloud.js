const uuid = require('uuid/v4')
const AV = require('leanengine')
const Order = require('./order')
const wxpay = require('./wxpay')
const request = require('request')

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function (request, response) {
  response.success('Hello world!')
})

/**
 * 小程序创建订单
 */
AV.Cloud.define('order', (request, response) => {
  const user = request.currentUser
  if (!user) {
    return response.error(new Error('用户未登录'))
  }
  const authData = user.get('authData')
  const username = user.get('username')
  if (!authData || !authData.lc_weapp) {
    return response.error(new Error('当前用户不是小程序用户'))
  }
  const order = new Order()
  order.tradeId = uuid().replace(/-/g, '')
  order.status = 'INIT'
  order.user = request.currentUser
  order.productDescription = request.params.link
    ? `「${request.params.link.options.name}」`
    : (request.params.paramspayDescription || '🍵 请郭老师喝碗茶')
  order.referrer = request.params.referrer || ''
  order.amount = request.params.amount || 100
        // 设置白名单内的测试用户金额
  if (process.env.WHITELIST_USERNAME.indexOf(username) > -1) {
    order.amount = 1
  }
  order.link = request.params.link || {}
  order.ip = request.meta.remoteAddress
  if (!(order.ip && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(order.ip))) {
    order.ip = '127.0.0.1'
  }
  order.tradeType = 'JSAPI'
  const acl = new AV.ACL()
        // 只有创建订单的用户可以读，没有人可以写
  acl.setPublicReadAccess(false)
  acl.setPublicWriteAccess(false)
  acl.setReadAccess(user, true)
  acl.setWriteAccess(user, false)
  order.setACL(acl)
  order.place().then(() => {
    console.log(`预订单创建成功：订单号 [${order.tradeId}] prepayId [${order.prepayId}]`)
    const payload = {
      appId: process.env.WEIXIN_APPID,
      timeStamp: String(Math.floor(Date.now() / 1000)),
      package: `prepay_id=${order.prepayId}`,
      signType: 'MD5',
      nonceStr: String(Math.random())
    }
    payload.paySign = wxpay.sign(payload)
    response.success(payload)
  }).catch(error => {
    console.error(error)
    response.error(error)
  })
})

const reload = (id) => {
  if (!id) {
    console.error('reload id missing')
  }
  request({
    url: 'https://api.leancloud.cn/1.1/rtm/messages',
    method: 'POST',
    headers: {
      'X-LC-Id': process.env.LEANCLOUD_APP_ID,
      'X-LC-KEY': `${process.env.LEANCLOUD_APP_MASTER_KEY},master`
    },
    json: true,
    body: {
      from_peer: 'LeanCloud Reloader',
      to_peers: [id],
      conv_id: '58b8de7444d904006bee4ded',
      transient: true,
      message: 'reload'
    }
  }, (error, response, body) => {
    if (error) return console.error(error)
    console.log(response.statusCode, body)
    console.log(`send reload message to ${id} successfully`)
  })
}

AV.Cloud.afterSave('Todo', function (request) {
  if (request.currentUser) {
    reload(request.currentUser.id)
  }
})
AV.Cloud.afterUpdate('Todo', function (request) {
  if (request.currentUser) {
    reload(request.currentUser.id)
  }
})
AV.Cloud.afterDelete('Todo', function (request) {
  if (request.currentUser) {
    reload(request.currentUser.id)
  }
})
