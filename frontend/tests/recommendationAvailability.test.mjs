import test from 'node:test'
import assert from 'node:assert/strict'
import { currentOffer, refreshRecommendedOffers, closedOfferMessage } from '../src/utils/recommendationAvailability.js'

const item = { maDot: 'A', maCongTy: 'CT', maViTri: 'P1', rankingScore: 17, tiLeTuongThich: 41, conLai: 3 }

test('updates remaining capacity without changing ranking and removes closed positions', () => {
  const other = { ...item, maViTri: 'P2' }
  const offers = [{ ...other, soLuongNhan: 5, daTiepNhan: 2, conLai: 1, hanDangKy: '2029-01-10T10:00:00Z', diaChi: '123 Đường A' }]
  const result = refreshRecommendedOffers([item, other], offers)
  assert.equal(result.length, 1)
  assert.equal(result[0].maViTri, 'P2')
  assert.equal(result[0].conLai, 1)
  assert.equal(result[0].diaChi, '123 Đường A')
  assert.equal(result[0].daTiepNhan, 2)
  assert.equal(result[0].hanDangKy, offers[0].hanDangKy)
  assert.equal(result[0].rankingScore, 17)
  assert.equal(result[0].tiLeTuongThich, 41)
  assert.equal(item.conLai, 3)
})

test('matches the exact company, position and round before registration', () => {
  assert.equal(currentOffer(item, [{ ...item, maDot: 'B' }]), undefined)
  assert.equal(currentOffer(item, [{ ...item, maCongTy: 'OTHER' }]), undefined)
  assert.equal(currentOffer(item, [{ ...item, maViTri: 'P2' }]), undefined)
  assert.equal(currentOffer({ ...item, maViTri: null }, [{ ...item, maViTri: undefined }]).maCongTy, 'CT')
})

test('retains results while checking but clears them for an empty available list', () => {
  assert.deepEqual(refreshRecommendedOffers([item], undefined), [item])
  assert.deepEqual(refreshRecommendedOffers([item], []), [])
})

test('explains expired JD separately from capacity or stopped recruitment', () => {
  assert.match(closedOfferMessage({ hanDangKy: '2029-01-01T00:00:00Z' }, Date.parse('2029-01-02T00:00:00Z')), /hết hạn/)
  assert.match(closedOfferMessage(item), /đủ chỉ tiêu hoặc ngừng/)
})
