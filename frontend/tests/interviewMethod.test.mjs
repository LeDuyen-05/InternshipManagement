import test from 'node:test'
import assert from 'node:assert/strict'
import { formatInterviewMethod } from '../src/utils/interviewMethod.js'

test('keeps valid Vietnamese, actual addresses and meeting links unchanged', () => {
  for (const value of ['Trực tiếp tại tầng 5, số 123 Nguyễn Văn Linh', 'Trực tuyến qua Zoom: https://example.com/meet', 'Trực tiếp tại văn phòng FPT, phòng 204']) {
    assert.equal(formatInterviewMethod(value), value)
  }
})

test('repairs known corrupted Vietnamese prefixes without replacing the interview details', () => {
  assert.equal(formatInterviewMethod('Trá»±c tiáº¿p tại tầng 5'), 'Trực tiếp tại tầng 5')
  assert.equal(formatInterviewMethod('Tr?c tuy?n qua Zoom'), 'Trực tuyến qua Zoom')
  assert.equal(formatInterviewMethod('Trá»±c tuyáº¿n qua Teams'), 'Trực tuyến qua Teams')
})

test('missing interview method does not invent a meeting platform', () => {
  assert.equal(formatInterviewMethod(null), 'Chưa cập nhật hình thức phỏng vấn')
})

test('restores the whole corrupted address, not only the interview prefix', () => {
  assert.equal(formatInterviewMethod('Trá»±c tiáº¿p táº¡i vÄƒn phÃ²ng FPT Software'), 'Trực tiếp tại văn phòng FPT Software')
  assert.equal(formatInterviewMethod('Trá»±c tiáº¿p táº¡i trá»¥ sá»Ÿ VNG Campus'), 'Trực tiếp tại trụ sở VNG Campus')
  assert.equal(formatInterviewMethod('Trá»±c tiáº¿p táº¡i tÃ²a nhÃ  Viettel'), 'Trực tiếp tại tòa nhà Viettel')
})

test('mixed valid Vietnamese and broken words are preserved and repaired independently', () => {
  assert.equal(formatInterviewMethod('Trực tiếp tại văn phÃ²ng FPT'), 'Trực tiếp tại văn phòng FPT')
  assert.equal(formatInterviewMethod('Trá»±c tiáº¿p tại tầng 5'), 'Trực tiếp tại tầng 5')
  const link = 'https://example.com/meet?q=phÃ²ng&team=A'
  assert.equal(formatInterviewMethod(`Trá»±c tuyáº¿n ${link}`), `Trực tuyến ${link}`)
})

test('formatting is stable when applied twice and preserves valid international text', () => {
  const value = formatInterviewMethod('Trá»±c tiáº¿p táº¡i vÄƒn phÃ²ng FPT Software')
  assert.equal(formatInterviewMethod(value), value)
  assert.equal(formatInterviewMethod('Trực tuyến tại Café München — phòng 2'), 'Trực tuyến tại Café München — phòng 2')
})
