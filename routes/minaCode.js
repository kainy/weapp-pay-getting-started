const router = require('express').Router()
const axios = require('axios')
const { getAccessToken } = require('../access-token')
const AV = require('leanengine')

router.get('/minacode', function (req, res, next) {
  getAccessToken().then((accessToken) => {
    const data = {
      'page': req.query.page || 'pages/index/index',
      'scene': req.query.scene || 'xxx'
    }
    console.log(data)
    axios.post('https://api.weixin.qq.com/wxa/getwxacodeunlimit', data, {
    // axios.post('https://api.weixin.qq.com/wxa/getwxacode', data, {
      params: {
        access_token: accessToken,
        dataType: 'JSON'
      },
      responseType: 'arraybuffer'
    }).then((data) => {
      var imageFile = new AV.File('file-qrcode', data.data)
      return imageFile.save()
      // var bytes = [0xBE, 0xEF, 0xCA, 0xFE]
      // return new AV.File('minacode.png', bytes).save()
    }).then(result => {
      // console.log(result)
      res.send(result)
    })
  })
})
module.exports = router
