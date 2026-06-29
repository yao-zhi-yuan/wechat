# 微信小程序水饮店铺设计方案

## 1. 背景和目标

本项目建设一个给单家公司使用的微信小程序店铺，经营饮用水、桶装水、箱装饮料、可口可乐等饮品，以及可能扩展到餐巾纸等日用品。产品形态不是“每次发起一个接龙活动”，而是类似单个美团商铺或轻量商城：用户从微信群分享卡片进入店铺，选择商品和数量，填写配送地址，使用微信支付下单；商家在同一个小程序中管理商品、订单、配送和退款。

一期目标是把“商品展示、用户下单、微信支付、商家接单、配送状态、微信原路退款”跑通，并保持架构足够简单。库存、配送范围、多门店、网页后台、优惠券、会员体系不进入一期范围，但数据结构会预留扩展位。

## 2. 已确认需求

- 主体条件：已有企业或个体工商户资质，但还没有小程序或小程序未认证。
- 支付方式：直接接入官方微信支付，不做收款码过渡方案。
- 商品形态：固定商品清单，商家可增删改商品。
- 经营品类：水饮、饮料、可能扩展到餐巾纸等日用品。
- 履约方式：商家同城配送，用户下单时填写收货地址。
- 配送费：一期免配送费，订单金额等于商品合计金额。
- 库存与配送范围：一期不做强管控，由商家人工兜底；后续再加。
- 商家后台：一期做在同一个小程序里，后续再考虑网页后台。
- 管理员：一期用 OpenID 白名单，后续再做邀请/绑定码。
- 新订单提醒：使用小程序订阅消息提醒管理员。
- 退款：接入微信支付原路退款。
- 订单状态：待支付、已支付/待配送、配送中、已完成、已取消、退款中、已退款。

## 3. 推荐架构

采用“微信小程序原生 + 微信云开发 + 官方微信支付”。

小程序前端负责用户购物、订单查看、商家端管理。微信云开发提供云数据库、云函数、云存储和支付回调承载能力。云函数处理下单、支付、支付回调、退款、退款回调、订单状态流转、订阅消息和管理员权限判断。商品图片存放在云存储，订单、商品、用户、支付和退款数据存放在云数据库。

一期不单独租云服务器，不自建 MySQL。这样可以减少域名、备案、HTTPS、服务器安全、数据库备份和运维成本。后续如果需要网页后台、多门店、ERP 对接或更复杂报表，可以在现有云数据库和接口边界上扩展到云托管或独立服务。

## 4. 上线前置条件

1. 注册企业或个体工商户微信小程序。
2. 完成小程序认证。
3. 申请微信支付商户号，并将商户号与小程序 AppID 绑定。
4. 开通微信云开发环境。
5. 在小程序后台选择与实际经营一致的服务类目，并按后台要求提交食品饮料、日用品相关经营资质。
6. 配置微信支付 API 证书/密钥、公钥或平台证书相关安全材料。
7. 配置订阅消息模板，例如新订单通知、支付成功通知、配送状态通知。
8. 按交易类小程序要求接入订单发货管理能力，尤其是食品饮料这类实物商品在线销售及配送场景。技术实现优先使用发货信息管理 API；如果后台能力或审核节奏导致 API 暂不可用，上线前必须明确商家在小程序管理后台手工录入发货信息的流程，并在商家端保留“待同步发货信息”的状态提示。

资质和费率以微信公众平台、微信支付商户平台后台最终审核结果为准。技术方案不能保证固定费率或固定审核材料。

## 5. 产品模块

### 5.1 用户端

用户端首页展示店铺名称、公告、客服电话、配送说明、商品分类和商品列表。商品卡片包含图片、名称、规格、价格、上下架状态和购买按钮。用户可调整商品数量并进入结算页。

结算页展示商品明细、商品总价、配送费 0 元、实付金额、收货人姓名、手机号、详细地址和订单备注。用户提交订单后进入微信支付。支付完成后进入订单详情。

用户可查看订单列表和订单详情。订单详情展示商品快照、金额、地址、支付状态、配送状态、退款状态和联系商家入口。订单可从微信群分享入口进入店铺或商品页。

### 5.2 商家端

商家端入口仅对白名单管理员可见。管理员登录后可以管理商品、查看订单、变更配送状态、发起退款、开启新订单订阅提醒。

商品管理支持新增、编辑、上架、下架、排序、上传图片、设置分类、设置价格、设置规格说明。库存字段保留但一期不启用校验。

订单管理支持按状态筛选。商家可将“已支付/待配送”订单改为“配送中”，将“配送中”订单改为“已完成”。发起配送时记录配送时间，并触发微信订单发货管理同步。若接口同步失败，订单保留为配送中，但商家端必须展示“发货信息待同步/同步失败”，方便管理员重试或按后台手工流程处理。

退款管理支持对已支付且未退款订单发起原路退款。退款请求成功后订单进入“退款中”，等待微信退款回调后变为“已退款”。

### 5.3 通知

用户下单前或支付后，可以请求订阅支付成功、配送状态等模板消息。管理员进入商家端时，可以点击“开启新订单提醒”，小程序请求订阅新订单通知模板。支付成功回调后，系统向已授权管理员发送新订单订阅消息。

订阅消息不是无限制推送，必须遵守微信订阅消息授权机制。发送失败不影响订单主流程，商家端订单列表仍是最终工作台。

## 6. 数据模型

### 6.1 products

保存商品主数据。

- `_id`
- `name`
- `categoryId`
- `images`
- `spec`
- `description`
- `priceFen`
- `status`: `on_sale` 或 `off_sale`
- `sortOrder`
- `stockEnabled`: 一期固定为 `false`
- `stock`: 一期可为空
- `createdAt`
- `updatedAt`

订单中必须保存商品快照，不能只引用商品 ID。商品后续改价或改名不应影响历史订单。

### 6.2 categories

保存商品分类。

- `_id`
- `name`
- `sortOrder`
- `status`
- `createdAt`
- `updatedAt`

### 6.3 orders

保存订单主记录。

- `_id`
- `orderNo`
- `userOpenId`
- `items`: 商品快照数组，包含商品 ID、名称、规格、图片、单价、数量、小计
- `goodsAmountFen`
- `deliveryFeeFen`: 一期固定为 0
- `payAmountFen`
- `receiverName`
- `receiverPhone`
- `receiverAddress`
- `remark`
- `status`: `pending_payment`、`paid_waiting_delivery`、`delivering`、`completed`、`cancelled`、`refunding`、`refunded`
- `payStatus`: `not_paid`、`paid`、`closed`、`refunded`
- `deliveryStatus`: `not_started`、`delivering`、`completed`
- `refundStatus`: `none`、`processing`、`success`、`failed`
- `wechatTransactionId`
- `wechatOutTradeNo`
- `wechatShippingUploadStatus`: `not_required`、`pending`、`uploaded`、`failed`、`manual_required`
- `wechatShippingUploadedAt`
- `wechatShippingError`
- `paidAt`
- `deliveryStartedAt`
- `completedAt`
- `cancelledAt`
- `createdAt`
- `updatedAt`

### 6.4 payments

保存支付记录。

- `_id`
- `orderId`
- `orderNo`
- `outTradeNo`
- `prepayId`
- `transactionId`
- `amountFen`
- `status`: `created`、`success`、`failed`、`closed`
- `callbackReceivedAt`
- `callbackSummary`
- `createdAt`
- `updatedAt`

### 6.5 refunds

保存退款记录。

- `_id`
- `orderId`
- `orderNo`
- `outRefundNo`
- `refundId`
- `amountFen`
- `reason`
- `status`: `created`、`processing`、`success`、`failed`
- `callbackReceivedAt`
- `callbackSummary`
- `createdAt`
- `updatedAt`

### 6.6 users

保存用户基础信息。

- `_id`
- `openId`
- `lastReceiverName`
- `lastReceiverPhone`
- `lastReceiverAddress`
- `subscribeSettings`
- `createdAt`
- `updatedAt`

### 6.7 admins

保存管理员白名单。

- `_id`
- `openId`
- `name`
- `role`: 一期可统一为 `owner`
- `enabled`
- `newOrderNoticeEnabled`
- `createdAt`
- `updatedAt`

### 6.8 shop_config

保存店铺配置。

- `_id`
- `shopName`
- `announcement`
- `servicePhone`
- `deliveryDescription`
- `deliveryFeeEnabled`: 一期固定为 `false`
- `deliveryFeeFen`: 一期固定为 0
- `deliveryAreaEnabled`: 一期固定为 `false`
- `deliveryAreaDescription`
- `businessHours`
- `updatedAt`

## 7. 核心流程

### 7.1 下单和支付

1. 用户选择商品和数量。
2. 小程序调用云函数创建订单。
3. 云函数读取最新商品数据，校验商品上架状态和价格，计算订单金额。
4. 云函数创建 `orders` 和 `payments` 记录，订单状态为 `pending_payment`。
5. 云函数调用微信支付下单接口，得到预支付会话参数。
6. 小程序调用 `wx.requestPayment` 拉起微信支付。
7. 微信支付完成后，微信支付系统回调云函数。
8. 云函数校验回调签名和金额，更新支付记录与订单状态为 `paid_waiting_delivery`。
9. 云函数发送用户支付成功通知和管理员新订单通知。

前端支付成功回调只能作为用户体验提示，不能作为订单已支付的最终依据。订单支付结果以后端支付回调或主动查单结果为准。

### 7.2 商家配送

1. 管理员进入商家端订单列表。
2. 管理员打开已支付订单详情。
3. 管理员点击开始配送。
4. 云函数校验管理员权限和订单状态。
5. 云函数更新订单为 `delivering`，记录 `deliveryStartedAt`。
6. 系统调用发货信息管理 API 上传订单商品和同城配送信息，并把 `wechatShippingUploadStatus` 更新为 `uploaded`。
7. 如果 API 同步失败，系统把 `wechatShippingUploadStatus` 更新为 `failed` 或 `manual_required`，商家端展示重试或手工录入提示。
8. 用户可在订单详情看到配送中状态。

### 7.3 完成订单

1. 管理员确认订单已送达。
2. 云函数校验订单处于 `delivering`。
3. 云函数更新订单为 `completed`，记录 `completedAt`。
4. 如订阅消息权限可用，系统向用户发送配送完成或订单完成通知。

### 7.4 退款

1. 管理员在订单详情点击退款。
2. 云函数校验管理员权限、订单支付状态、退款状态和金额。
3. 云函数调用微信支付退款接口。
4. 退款请求成功后，订单状态变为 `refunding`，退款记录为 `processing`。
5. 微信退款回调到云函数。
6. 云函数校验回调并更新退款记录。
7. 退款成功后订单状态变为 `refunded`。

## 8. 安全和权限

小程序端不能保存微信支付密钥、商户证书、AppSecret 或管理员敏感配置。所有支付、退款、订单状态变更和管理员校验都在云函数内完成。

云数据库安全规则默认禁止普通用户直接写订单状态、商品、支付记录、退款记录和管理员配置。用户只能读取自己的订单，管理员通过云函数访问商家端数据。商品列表可对所有用户开放读取，但商品写入只能由管理员云函数完成。

所有金额以“分”为单位保存和计算，避免浮点误差。支付回调必须校验订单号、金额、商户号、AppID 和签名。

## 9. 合规和平台规则

饮用水、饮料和日用品属于实物商品在线销售配送场景。小程序应按实际经营内容选择服务类目，并按平台要求提交食品饮料或日用品相关资质。

交易类小程序需要关注商品发布规范、发货规范、交易争议处理和资金结算规则。微信官方文档说明，食品饮料等实物商品在线销售及配送相关小程序需要接入订单发货管理能力。方案应把发货信息同步能力纳入上线检查，而不是只在自有订单表中改状态。

## 10. 一期不做内容和扩展方式

一期不做库存强管控。后续扩展时，在 `products.stockEnabled` 打开库存开关，并在支付成功或创建订单阶段扣减库存。是否采用“下单锁库存”或“支付成功扣库存”需要按业务缺货容忍度再定。

一期不做配送范围强管控。后续扩展时，在 `shop_config.deliveryAreaEnabled` 打开配送范围开关，并增加小区白名单、街道、行政区或地图围栏配置。

一期不做网页后台。后续可以复用云函数接口或拆出管理 API，新增 Web 管理后台。

一期不做多门店。后续可增加 `shops` 集合，并在商品、订单、管理员中加入 `shopId`。

一期不做优惠券、会员价、积分、营销活动。后续可在订单金额计算云函数中扩展优惠计算模块。

## 11. 验收标准

- 用户能从小程序进入店铺，看到商品并提交订单。
- 用户能通过微信支付完成真实付款。
- 支付回调能把订单从待支付变为已支付/待配送。
- 管理员能在小程序商家端新增、编辑、上下架商品。
- 管理员能查看已支付订单并更新配送中、已完成状态。
- 管理员能对已支付订单发起微信原路退款，退款回调后订单变为已退款。
- 管理员授权后能收到新订单订阅消息；通知失败不影响订单主流程。
- 用户只能查看自己的订单，普通用户不能访问商家端。
- 商品改价后，历史订单仍显示下单时的商品快照和金额。
- 订单金额与微信支付金额一致，且以分为单位计算。
- 实物订单发货管理能力已接入或已按官方后台要求完成配置和验证。

## 12. 主要风险

- 小程序服务类目、食品饮料资质、微信支付商户号审核材料以平台后台要求为准，可能需要商家补充材料。
- 微信支付费率按经营类目和商户入驻结果确定，不由技术方案固定。
- 订阅消息必须经过用户或管理员授权，无法保证每条都一定到达。
- 如果后续订单量、商品量或后台管理复杂度快速上升，云开发的简单模型可能需要升级为云托管或独立服务。
- 如果商家未按平台要求及时同步发货信息，可能影响交易体验、资金结算或平台风控。

## 13. 官方参考

- 微信小程序支付接口 `wx.requestPayment`: https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestPayment.html
- 微信支付小程序支付产品介绍: https://pay.weixin.qq.com/doc/v3/merchant/4012791894
- 微信支付小程序支付开发指引: https://pay.weixin.qq.com/doc/v3/merchant/4012791911
- 微信云开发: https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 小程序转发能力: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/share.html
- 小程序订阅消息: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html
- 交易类小程序运营规范: https://developers.weixin.qq.com/miniprogram/product/jiaoyilei/yunyingguifan.html
- 订单发货管理功能介绍及接入计划: https://developers.weixin.qq.com/miniprogram/product/jiaoyilei/fahuoguanligongneng.html
