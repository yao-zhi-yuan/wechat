import { formatFen } from '../../../utils/money';

export function buildAdminProductViewModels(products) {
  return products.map((product) => ({
    ...product,
    priceText: formatFen(product.priceFen || 0),
    statusText: product.status === 'off_sale' ? '已下架' : '上架中'
  }));
}
