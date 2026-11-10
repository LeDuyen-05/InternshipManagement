export const offerKey = offer => JSON.stringify([offer.maDot, offer.maCongTy, offer.maViTri || null])

export function currentOffer(item, offers) {
  return offers?.find(offer => offerKey(offer) === offerKey(item))
}

export function refreshRecommendedOffers(items, offers) {
  if (!offers) return items
  return items.flatMap(item => {
    const offer = currentOffer(item, offers)
    return offer ? [{ ...item, soLuongNhan: offer.soLuongNhan, daTiepNhan: offer.daTiepNhan,
      conLai: offer.conLai, hanDangKy: offer.hanDangKy, diaChi: offer.diaChi }] : []
  })
}

export function closedOfferMessage(item, now = Date.now()) {
  return item.hanDangKy && new Date(item.hanDangKy).getTime() < now
    ? 'Vị trí đã hết hạn đăng ký.'
    : 'Vị trí đã đủ chỉ tiêu hoặc ngừng nhận đăng ký.'
}
