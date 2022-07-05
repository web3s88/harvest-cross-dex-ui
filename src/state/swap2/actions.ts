import { createAction } from '@reduxjs/toolkit'

export enum Field {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

export const selectCurrency = createAction<{
  field: Field
  currencyId: string,
  force?: boolean
}>('swap2/selectCurrency')
export const switchCurrencies = createAction<void>('swap2/switchCurrencies')
export const typeInput = createAction<{ field: Field; typedValue: string }>('swap2/typeInput')
export const replaceSwapState = createAction<{
  field: Field
  typedValue: string
  inputCurrencyId?: string
  outputCurrencyId?: string
  recipient: string | null
}>('swap2/replaceSwapState')
export const setRecipient = createAction<{ recipient: string | null }>('swap2/setRecipient')
