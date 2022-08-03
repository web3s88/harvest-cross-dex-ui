import { ChainId, Currency, CurrencyAmount, Pair, Percent, Token } from '@sushiswap/sdk'
import React, { Fragment, ReactNode, useCallback, useEffect, useState } from 'react'
import { classNames, formatCurrencyAmount } from '../../functions'

import Button from '../Button'
import { ChevronDownIcon } from '@heroicons/react/outline'
import CurrencyLogo from '../CurrencyLogo'
import CurrencySearchModal from '../../modals/SearchModal/CurrencySearchModal'
import DoubleCurrencyLogo from '../DoubleLogo'
import { FiatValue } from './FiatValue'
import Input from '../Input'
import Lottie from 'lottie-react'
import selectCoinAnimation from '../../animation/select-coin.json'
import { t } from '@lingui/macro'
import { useActiveWeb3React } from '../../hooks/useActiveWeb3React'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { useLingui } from '@lingui/react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, SelectorIcon } from '@heroicons/react/solid'
import Image from 'next/image'

import { set } from 'react-ga'
import * as net from 'net'
import { NETWORK_ICON } from '../../config/networks'

const networks = {
  [ChainId.MAINNET]: 'ETH',
  [ChainId.BSC]: 'BSC',
  [ChainId.MATIC]: 'MATIC',
}
// [
//   {
//     ChainId.MAINNET,
//     name: 'ETH',
//   },
//   {
//     id: ChainId.BSC,
//     name: 'BSC',
//   },
//   {
//     id: ChainId.MATIC,
//     name: 'MATIC',
//   },
// ]

interface CurrencyInputPanelProps {
  value?: string
  onUserInput?: (value: string) => void
  onMax?: () => void
  showMaxButton: boolean
  label?: string
  onCurrencySelect?: (currency: Currency) => void
  onChainSelect?: (chainId: number) => void
  currency?: Currency | null
  disableCurrencySelect?: boolean
  hideBalance?: boolean
  pair?: Pair | null
  hideInput?: boolean
  otherCurrency?: Currency | null
  fiatValue?: CurrencyAmount<Token> | null
  priceImpact?: Percent
  id: string
  showCommonBases?: boolean
  renderBalance?: (amount: CurrencyAmount<Currency>) => ReactNode
  locked?: boolean
  customBalanceText?: string
  toChainId?: number
}

export default function CurrencyInputPanel({
  value,
  onUserInput,
  onMax,
  showMaxButton,
  label = 'Input',
  onCurrencySelect,
  onChainSelect,
  currency,
  disableCurrencySelect = false,
  otherCurrency,
  id,
  showCommonBases,
  renderBalance,
  fiatValue,
  priceImpact,
  hideBalance = false,
  pair = null, // used for double token logo
  hideInput = false,
  locked = false,
  customBalanceText,
  toChainId = undefined,
}: CurrencyInputPanelProps) {
  const { i18n } = useLingui()
  const [modalOpen, setModalOpen] = useState(false)
  const { account, chainId } = useActiveWeb3React(toChainId)
  const selectedCurrencyBalance = useCurrencyBalance(account ?? undefined, currency ?? undefined)

  const handleDismissSearch = useCallback(() => {
    setModalOpen(false)
  }, [setModalOpen])

  //
  // const [toNetwork, setToNetwork] = useState(networks[0])
  //
  // useEffect(() => {
  //   if (chainId) {
  //     const network = networks.find((network) => network.id !== chainId)
  //     setToNetwork(network)
  //   }
  // }, [chainId])

  return (
    <div id={id} className={classNames(hideInput ? 'p-4' : 'p-5', 'rounded bg-whitesmoke swap-header-innerbox')}>
      <div className="flex flex-col items-center justify-between space-y-3 sm:space-y-0 sm:flex-row">
        <div className={classNames('flex items-center')}>
          <button
            type="button"
            className={classNames(
              !!currency ? 'text-primary' : 'text-high-emphesis',
              'open-currency-select-button h-full outline-none select-none cursor-pointer border-none text-xl font-medium'
            )}
            onClick={() => {
              if (onCurrencySelect) {
                setModalOpen(true)
              }
            }}
          >
            <div className="flex">
              {pair ? (
                <DoubleCurrencyLogo currency0={pair.token0} currency1={pair.token1} size={54} margin={true} />
              ) : currency ? (
                <div className="flex items-center">
                  <CurrencyLogo currency={currency} size={'54px'} />
                </div>
              ) : (
                <div className="rounded bg-dark-700" style={{ maxWidth: 54, maxHeight: 54 }}>
                  <div style={{ width: 54, height: 54 }}>
                    <Lottie animationData={selectCoinAnimation} autoplay loop />
                  </div>
                </div>
              )}
              {pair ? (
                <span
                  className={classNames(
                    'pair-name-container',
                    Boolean(currency && currency.symbol) ? 'text-2xl' : 'text-xs'
                  )}
                >
                  {pair?.token0.symbol}:{pair?.token1.symbol}
                </span>
              ) : (
                <div className="flex flex-col items-start justify-center flex-1 mx-3">
                  {label && <div className="text-xs font-medium text-secondary whitespace-nowrap">{label}</div>}
                  <div className="flex items-center">
                    <div className="text-lg font-bold token-symbol-container md:text-xl">
                      {(currency && currency.symbol && currency.symbol.length > 20
                        ? currency.symbol.slice(0, 4) +
                        '...' +
                        currency.symbol.slice(currency.symbol.length - 5, currency.symbol.length)
                        : currency?.symbol) || (
                          <div className="px-2 py-1 mt-1 text-xs font-medium bg-transparent border rounded-full hover:bg-primary border-low-emphesis text-secondary whitespace-nowrap ">
                            {i18n._(t`Select a token`)}
                          </div>
                        )}
                    </div>

                    {!disableCurrencySelect && currency && (
                      <ChevronDownIcon width={16} height={16} className="ml-2 stroke-current" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </button>
        </div>
        {toChainId && (
          <Listbox value={toChainId} onChange={onChainSelect}>
            <div className="relative z-10 p-1">
              <Listbox.Button className="relative flex text-sm bg-white border border-gray-600 rounded currency-network">
                <Image
                  src={NETWORK_ICON[toChainId]}
                  alt="Switch Network"
                  className="rounded-md"
                  width="32px"
                  height="32px"
                />
                <span className="block pl-1 truncate">{networks[toChainId]}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                  <SelectorIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {Object.keys(networks).map((id) => (
                    <Listbox.Option
                      value={id}
                      key={id}
                      className={({ active }) =>
                        `${active ? 'text-amber-900 bg-amber-100' : 'text-gray-900'}
                          cursor-default select-none relative py-2 pl-10 pr-4`
                      }
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`${selected ? 'font-medium' : 'font-normal'} block truncate`}>
                            {networks[id]}
                          </span>
                          {selected ? (
                            <span
                              className={`${active ? 'text-amber-600' : 'text-amber-600'}
                                absolute inset-y-0 left-0 flex items-center pl-3`}
                            >
                              <CheckIcon className="w-5 h-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        )}
        {!hideInput && (
          <div
            className={classNames(
              'flex items-center w-full space-x-3 rounded bg-white focus:bg-dark-700 p-3 sm:w-3/5 relative'
              // showMaxButton && selectedCurrencyBalance && 'px-3'
            )}
          >
            <>
              {showMaxButton && selectedCurrencyBalance && (
                <Button
                  onClick={onMax}
                  size="xs"
                  className="text-xs font-medium bg-transparent border rounded-full hover:bg-primary border-low-emphesis text-secondary whitespace-nowrap"
                >
                  {i18n._(t`Max`)}
                </Button>
              )}
              <Input.Numeric
                id="token-amount-input"
                value={value}
                onUserInput={(val) => {
                  onUserInput(val)
                }}
                readOnly={!!toChainId}
              />
              {!hideBalance && currency && selectedCurrencyBalance ? (
                <div className="flex flex-col">
                  <div onClick={onMax} className="absolute top-0 text-xs font-medium text-right cursor-pointer text-low-emphesis right-2">
                    {renderBalance ? (
                      renderBalance(selectedCurrencyBalance)
                    ) : (
                      <>
                        {i18n._(t`Balance:`)} {formatCurrencyAmount(selectedCurrencyBalance, 4)} {currency.symbol}
                      </>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-2">
                    <FiatValue fiatValue={fiatValue} priceImpact={priceImpact} />
                  </div>
                </div>
              ) : (
                <FiatValue fiatValue={fiatValue} />
              )}
            </>
          </div>
        )}
      </div>
      {!disableCurrencySelect && onCurrencySelect && (
        <CurrencySearchModal
          isOpen={modalOpen}
          onDismiss={handleDismissSearch}
          onCurrencySelect={onCurrencySelect}
          selectedCurrency={currency}
          otherSelectedCurrency={otherCurrency}
          showCommonBases={showCommonBases}
          toNetwork={toChainId}
        />
      )}
    </div>
  )
}
