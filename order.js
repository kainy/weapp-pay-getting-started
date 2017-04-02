const AV = require('leanengine');
const axios = require('axios');
const wxpay = require('./wxpay');
const {
  validateSign,
  handleError,
} = require('./utils');
const { getAccessToken } = require('./access-token')

class Order extends AV.Object {
  get tradeId() { return this.get('tradeId'); }
  set tradeId(value) { this.set('tradeId', value); }

  get amount() { return this.get('amount'); }
  set amount(value) { this.set('amount', value); }

  get user() { return this.get('user'); }
  set user(value) { this.set('user', value); }

  get productDescription() { return this.get('productDescription'); }
  set productDescription(value) { this.set('productDescription', value); }

  get status() { return this.get('status'); }
  set status(value) { this.set('status', value); }

  get ip() { return this.get('ip'); }
  set ip(value) { this.set('ip', value); }

  get tradeType() { return this.get('tradeType'); }
  set tradeType(value) { this.set('tradeType', value); }

  get prepayId() { return this.get('prepayId'); }
  set prepayId(value) { this.set('prepayId', value); }

  get link() { return this.get('link'); }
  set link(value) { this.set('link', value); }

  place() {
    return new Promise((resolve, reject) => {
      // 参数文档： https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=9_1
      wxpay.createUnifiedOrder({
        openid: this.user.get('authData').lc_weapp.openid,
        body: this.productDescription,
        out_trade_no: this.tradeId,
        total_fee: this.amount,
        spbill_create_ip: this.ip,
        notify_url: process.env.WEIXIN_NOTIFY_URL,
        trade_type: this.tradeType,
      }, function (err, result) {
        console.log(err, result);
        if (err) return reject(err);
        return resolve(result);
      });
    }).then(handleError).then(validateSign).then(({
      prepay_id,
    }) => {
      this.prepayId = prepay_id;
      return this.save();
    });
  }

  sendNotice() {
    const d = new Date(this.get('paidAt'))
    const arr = d.toString().split(' ')
    const data = {
      touser: this.user.get('authData').lc_weapp.openid,
      template_id: '5SOa_RWr1rOjAEcmVVXuVyZ2XaLwruaTL5MKddwDkTI',
      form_id: this.prepayId,
      data: {
        "keyword1": {
          "value": '小程序打赏',
          "color": "#1aad19",
        },
        "keyword2": {
          "value": `${this.amount / 100} 元`,
        },
        "keyword3": {
          "value": `${arr[3]}-${d.getMonth()+1}-${arr[2]} ${arr[4]}`
        },
        "keyword4": {
          "value": this.tradeId,
        }
      },
      emphasis_keyword: 'keyword1.DATA',
      page: "pages/my-pay/pay",
    };
    console.log('send notice: ', data);
    return getAccessToken().then(accessToken =>
      axios.post('https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send', data, {
        params: {
          access_token: accessToken,
        },
      }).then(({data}) => {
        console.log(data);
      })
    );
  }
}
AV.Object.register(Order);

module.exports = Order;