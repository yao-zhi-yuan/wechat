export const seedData = {
  shop_config: [{
    _id: 'default',
    shopName: '水饮到家',
    announcement: '下单后由商家同城配送',
    servicePhone: '13800138000',
    deliveryDescription: '微信群覆盖区域内免配送费',
    deliveryFeeEnabled: false,
    deliveryFeeFen: 0,
    deliveryAreaEnabled: false,
    deliveryAreaDescription: '当前仅服务微信群覆盖区域',
    businessHours: '08:00-20:00',
    templateIds: {
      newOrder: ''
    },
    updatedAt: new Date()
  }],
  categories: [
    { _id: 'water', name: '饮用水', sortOrder: 10, status: 'enabled' },
    { _id: 'drinks', name: '饮料', sortOrder: 20, status: 'enabled' },
    { _id: 'daily', name: '日用品', sortOrder: 30, status: 'enabled' }
  ],
  products: [
    { name: '农夫山泉桶装水', categoryId: 'water', images: [], spec: '19L/桶', description: '桶装饮用水', priceFen: 1800, status: 'on_sale', sortOrder: 10, stockEnabled: false, stock: null },
    { name: '农夫山泉箱装水', categoryId: 'water', images: [], spec: '550ml*24瓶', description: '箱装饮用水', priceFen: 3600, status: 'on_sale', sortOrder: 20, stockEnabled: false, stock: null },
    { name: '可口可乐', categoryId: 'drinks', images: [], spec: '330ml*24罐', description: '箱装饮料', priceFen: 5200, status: 'on_sale', sortOrder: 30, stockEnabled: false, stock: null }
  ]
};

console.log(JSON.stringify(seedData, null, 2));
