export function requestOrderPayment(wxApi, payment) {
  return new Promise((resolve, reject) => {
    wxApi.requestPayment({
      ...payment,
      success: resolve,
      fail: reject
    });
  });
}
