import { callApi } from '../../services/api';
import { formatFen } from '../../utils/money';
import { buildCheckoutCartUrl, pruneCartForProducts } from './cart';

const DEFAULT_SHOP_NAME = '水饮到家';

Page({
  data: {
    shop: null,
    shopName: DEFAULT_SHOP_NAME,
    categories: [],
    products: [],
    cart: {},
    cartTotalCount: 0,
    loading: true,
    error: ''
  },

  async onLoad() {
    await this.loadData();
  },

  async onPullDownRefresh() {
    try {
      await this.loadData();
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    try {
      const [shop, catalogue] = await Promise.all([
        callApi('getShopConfig'),
        callApi('listProducts')
      ]);
      const categories = catalogue.categories || [];
      const products = catalogue.products || [];
      const cart = pruneCartForProducts(this.data.cart, products);
      this.setData({
        shop,
        shopName: shop && shop.shopName ? shop.shopName : DEFAULT_SHOP_NAME,
        categories,
        products: this.buildProductViewModels(products, categories, cart),
        cart,
        cartTotalCount: this.countCartItems(cart),
        loading: false,
        error: ''
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: error && error.message ? error.message : '服务暂时不可用'
      });
    }
  },

  retryLoad() {
    return this.loadData();
  },

  addToCart(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    const cart = { ...this.data.cart };
    cart[id] = (cart[id] || 0) + 1;
    this.setData({
      cart,
      cartTotalCount: this.countCartItems(cart),
      products: this.buildProductViewModels(this.data.products, this.data.categories, cart)
    });
  },

  goCheckout() {
    const cart = pruneCartForProducts(this.data.cart, this.data.products);
    const cartTotalCount = this.countCartItems(cart);
    this.setData({
      cart,
      cartTotalCount,
      products: this.buildProductViewModels(this.data.products, this.data.categories, cart)
    });
    if (!cartTotalCount) {
      return;
    }
    wx.navigateTo({
      url: buildCheckoutCartUrl(cart, { storage: wx })
    });
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/orders/index' });
  },

  onShareAppMessage() {
    return {
      title: this.data.shopName || DEFAULT_SHOP_NAME,
      path: '/pages/shop/index'
    };
  },

  buildProductViewModels(products, categories, cart) {
    const categoryNames = categories.reduce((map, category) => {
      map[category._id] = category.name;
      return map;
    }, {});
    return products.map((product) => ({
      ...product,
      priceText: formatFen(product.priceFen || 0),
      categoryName: categoryNames[product.categoryId] || '',
      cartQuantity: cart[product._id] || 0
    }));
  },

  countCartItems(cart) {
    return Object.keys(cart).reduce((total, id) => total + cart[id], 0);
  }
});
