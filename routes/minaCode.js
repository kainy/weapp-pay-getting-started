const router = require('express').Router()
const axios = require('axios')
const { getAccessToken } = require('../access-token')
const AV = require('leanengine')

router.get('/minacode', function (req, res, next) {
  getAccessToken().then((accessToken) => {
    // console.log(accessToken)
    const data = {
      path: 'pages/index?query=1'
    }
    axios.post('https://api.weixin.qq.com/wxa/getwxacode', data, {
      params: {
        access_token: accessToken
      }
    }).then(({data}) => {
      var bytes = [0xBE, 0xEF, 0xCA, 0xFE]
      return new AV.File('minacode.png', bytes).save()
    })
  })
})
module.exports = router
