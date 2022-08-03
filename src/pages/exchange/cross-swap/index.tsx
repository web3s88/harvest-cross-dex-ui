import {
  ARCHER_ROUTER_ADDRESS,
  ChainId,
  Currency,
  CurrencyAmount,
  JSBI,
  Token,
  TradeType,
  Trade as V2Trade,
  NativeCurrency,
  WNATIVE_ADDRESS,
  toHex,
  Price,
} from '@sushiswap/sdk'
import { ApprovalState, useApproveCallback, useApproveCallbackFromTrade } from '../../../hooks/useApproveCallback'
import { ArrowWrapper, BottomGrouping, SwapCallbackError } from '../../../features/exchange-v1/swap/styleds'
import { ButtonConfirmed, ButtonError } from '../../../components/Button'
import Column, { AutoColumn } from '../../../components/Column'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { UseERC20PermitState, useERC20PermitFromTrade } from '../../../hooks/useERC20Permit'
import { useAllTokens, useCurrency } from '../../../hooks/Tokens'
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState,
} from '../../../state/swap/hooks'
import {
  useExpertModeManager,
  useUserArcherETHTip,
  useUserArcherGasPrice,
  useUserArcherUseRelay,
  useUserSingleHopOnly,
  useUserSlippageTolerance,
  useUserTransactionTTL,
} from '../../../state/user/hooks'
import {
  useAddPopup,
  useNetworkModalToggle,
  useToggleSettingsMenu,
  useWalletModalToggle,
} from '../../../state/application/hooks'
import useWrapCallback, { WrapType } from '../../../hooks/useWrapCallback'

import { ARCHER_RELAY_URI } from '../../../config/archer'
import AddressInputPanel from '../../../components/AddressInputPanel'
import { AdvancedSwapDetails } from '../../../features/exchange-v1/swap/AdvancedSwapDetails'
import AdvancedSwapDetailsDropdown from '../../../features/exchange-v1/swap/AdvancedSwapDetailsDropdown'
import Alert from '../../../components/Alert'
import { ArrowDownIcon } from '@heroicons/react/outline'
import Button from '../../../components/Button'
import ConfirmSwapModal from '../../../features/exchange-v1/swap/ConfirmSwapModal'
import Container from '../../../components/Container'
import CurrencyInputPanel from '../../../components/CurrencyInputPanel'
import DoubleGlowShadow from '../../../components/DoubleGlowShadow'
import { Field } from '../../../state/swap/actions'
import Head from 'next/head'
import { INITIAL_ALLOWED_SLIPPAGE } from '../../../constants'
import Loader from '../../../components/Loader'
import Lottie from 'lottie-react'
import MinerTip from '../../../features/exchange-v1/swap/MinerTip'
import ProgressSteps from '../../../components/ProgressSteps'
import ReactGA from 'react-ga'
import SwapHeader from '../../../features/trade/Header'
import TokenWarningModal from '../../../modals/TokenWarningModal'
import TradePrice from '../../../features/exchange-v1/swap/TradePrice'
import Typography from '../../../components/Typography'
import UnsupportedCurrencyFooter from '../../../features/exchange-v1/swap/UnsupportedCurrencyFooter'
import Web3Connect from '../../../components/Web3Connect'
import { classNames, computeFiatValueCrossPriceImpact, tryParseAmount } from '../../../functions'
import { computeFiatValuePriceImpact } from '../../../functions/trade'
import confirmPriceImpactWithoutFee from '../../../features/exchange-v1/swap/confirmPriceImpactWithoutFee'
import { maxAmountSpend } from '../../../functions/currency'
import swapArrowsAnimationData from '../../../animation/swap-arrows.json'
import { t } from '@lingui/macro'
import { useActiveWeb3React } from '../../../hooks/useActiveWeb3React'
import useENSAddress from '../../../hooks/useENSAddress'
import useIsArgentWallet from '../../../hooks/useIsArgentWallet'
import { useIsSwapUnsupported } from '../../../hooks/useIsSwapUnsupported'
import { useLingui } from '@lingui/react'
import usePrevious from '../../../hooks/usePrevious'
import { useRouter } from 'next/router'
import { useSwapCallback } from '../../../hooks/useSwapCallback'
import { useUSDCValue } from '../../../hooks/useUSDCPrice'
import { warningSeverity } from '../../../functions/prices'
import { getNetwork } from '../../../connectors'
import { useCrossBridgeContract, useExternalRouterContract, useRouterContract } from '../../../hooks'
import { formatUnits, parseUnits } from '@ethersproject/units'
import { useSingleCallResult } from '../../../state/multicall/hooks'
import { STABLE_USD } from '../../../config/tokens'
import { WrappedTokenInfo } from '../../../state/lists/wrappedTokenInfo'
import {
  useDefaultsFromURLSearch2,
  useDerivedSwapInfo2,
  useSwapActionHandlers2,
  useSwapState2,
} from '../../../state/swap2/hooks'
import { useCrossSwapCallback } from '../../../hooks/useCrossSwapCallback'

import { request, gql } from 'graphql-request'
import useSWR from 'swr'
import Table from '../../../components/Table'
import { NETWORK_ICON } from '../../../config/networks'
import Image from 'next/image'
import SwapRecord from './SwapRecord'
import styled from 'styled-components'
import { splitSignature } from '@ethersproject/bytes'
import axios from 'axios'

const HistoryTable = styled.table`
  table-layout: auto;

  th,
  td {
    padding: 12px 10px;
    line-height: 1.1;
  }

  th {
    text-align: left;
    font-weight: 500;
    background-color: #a74d06;
    color: #fff;
  }

  img {
    max-width: 20px !important;
    max-height: 20px !important;
  }

  tr:nth-child(2n + 1) {
    background-color: #eee;
  }
`

const TableWrapper = styled.div`
  border: 1px solid #aaa;
  border-radius: 8px;
  overflow: hidden;
`

const TableHeading = styled.h3`
  font-size: 1.5em;
  margin-bottom: 10px;
`

const supportChains = [ChainId.MAINNET, ChainId.BSC, ChainId.MATIC]

export default function CrossSwap() {
  const { i18n } = useLingui()

  const { account, chainId } = useActiveWeb3React()

  const [toChainId, setToChainId] = useState<number>(undefined)

  const [data, setData] = useState([])
  const [fetchInterval, setFetchInterval] = useState(null)

  useEffect(() => {
    async function fetchRequests() {
      if (!account) return
      axios.get(`https://api.harvestcapcrosschain.com/api/swaprequests/${account}`).then((v) => {
        setData(v.data)
      })
    }

    fetchRequests()
    if (!fetchInterval) {
      const fI = setInterval(fetchRequests, 60000)
      setFetchInterval(fI)
    }

    return () => {
      if (fetchInterval) {
        clearInterval(fetchInterval)
        setFetchInterval(null)
      }
    }
  }, [account, fetchInterval])

  // const { data, error, isLoading } = useMoralisQuery(
  //   'SwapRequests',
  //   (q) => {
  //     q.equalTo('account', (account || '0x371eb4a4771feb2e56728d48131e57fb4c5ea3e9').toLowerCase())
  //     return q
  //   },
  //   [account],
  //   { live: true }
  // )

  // const { data, error } = useSWR(account, fetcher, {
  //   refreshInterval: 60000,
  // })

  useEffect(() => {
    if (chainId) {
      const index = (supportChains.indexOf(chainId) + 1) % supportChains.length
      setToChainId(supportChains[index])
    } else {
      setToChainId(undefined)
    }
  }, [chainId])

  const onChainSelect = (chainId: number) => {
    setToChainId(chainId)
  }
  const loadedUrlParams = useDefaultsFromURLSearch()
  const loadedUrlParams2 = useDefaultsFromURLSearch2(toChainId)

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId),
  ]

  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c?.isToken ?? false) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens()
  const importTokensNotInDefault =
    urlLoadedTokens &&
    urlLoadedTokens.filter((token: Token) => {
      return !Boolean(token.address in defaultTokens)
    })

  const toggleNetworkModal = useNetworkModalToggle()

  const router = useRouter()

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // for expert mode
  const [isExpertMode] = useExpertModeManager()
  const toggleSettings = useToggleSettingsMenu()

  // get custom setting values for user
  const [ttl] = useUserTransactionTTL()
  const [useArcher] = useUserArcherUseRelay()
  const [archerETHTip] = useUserArcherETHTip()
  const [archerGasPrice] = useUserArcherGasPrice()

  // archer
  const archerRelay = chainId ? ARCHER_RELAY_URI?.[chainId] : undefined
  // const doArcher = archerRelay !== undefined && useArcher
  const doArcher = undefined

  // swap state
  const { independentField, typedValue, recipient } = useSwapState()
  const {
    v2Trade,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
    allowedSlippage,
  } = useDerivedSwapInfo(doArcher)

  const { independentField: independentField2, typedValue: typedValue2, recipient: recipient2 } = useSwapState2()
  const {
    v2Trade: v2Trade2,
    currencyBalances: currencyBalances2,
    parsedAmount: parsedAmount2,
    currencies: currencies2,
    inputError: swapInputError2,
    allowedSlippage: allowedSlippage2,
  } = useDerivedSwapInfo2(doArcher, false, toChainId)

  // console.log("v2Trade2", v2Trade2)

  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError,
  } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const { address: recipientAddress } = useENSAddress(recipient)

  const trade = showWrap ? undefined : v2Trade

  const parsedAmounts = useMemo(
    () =>
      showWrap
        ? {
          [Field.INPUT]: parsedAmount,
          [Field.OUTPUT]: parsedAmount,
        }
        : {
          [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
          [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
        },
    [independentField, parsedAmount, showWrap, trade]
  )

  const parsedAmounts2 = useMemo(
    () => ({
      [Field.INPUT]: independentField2 === Field.INPUT ? parsedAmount2 : v2Trade2?.inputAmount,
      [Field.OUTPUT]:
        independentField2 === Field.OUTPUT
          ? parsedAmount2
          : currencies2[Field.INPUT]?.equals(currencies2[Field.OUTPUT])
            ? parsedAmount2
            : v2Trade2?.outputAmount,
    }),
    [independentField2, parsedAmount2, currencies2, v2Trade2]
  )

  // const [outputCurrency, setOutPutCurrency] = useState<Currency>(undefined)
  // const [outputAmount, setOutputAmount] = useState('')

  const fiatValueInput = useUSDCValue(parsedAmounts[Field.INPUT])
  const fiatValueOutput = useUSDCValue(parsedAmounts[Field.OUTPUT])
  const fiatValueOutput2 = useUSDCValue(parsedAmounts2[Field.OUTPUT])

  const priceImpact = computeFiatValuePriceImpact(fiatValueInput, fiatValueOutput)
  const priceCrossImpact = computeFiatValueCrossPriceImpact(fiatValueInput, fiatValueOutput2)

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()
  const { onCurrencySelection2, onUserInput2 } = useSwapActionHandlers2()

  const isValid = !(swapInputError || swapInputError2) || Number(fiatValueOutput2?.toExact()) > 2

  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT
  const dependentField2: Field = independentField2 === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )

  const handleTypeInput2 = useCallback(
    (value: string) => {
      onUserInput2(Field.INPUT, value)
    },
    [onUserInput2]
  )

  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
    router.push('/swap/')
  }, [router])

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: V2Trade<Currency, Currency, TradeType> | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const formattedAmounts = useMemo(() => {
    return {
      [independentField]: typedValue,
      [dependentField]:
        currencies[Field.INPUT] && currencies[Field.OUTPUT] && currencies[Field.INPUT]?.equals(currencies[Field.OUTPUT])
          ? parsedAmounts[independentField]?.toExact() ?? ''
          : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
    }
  }, [currencies, dependentField, independentField, parsedAmounts, typedValue])

  const formattedAmounts2 = {
    [independentField2]: typedValue2,
    [dependentField2]: currencies2[Field.INPUT]?.equals(currencies2[Field.OUTPUT])
      ? parsedAmounts2[independentField2]?.toExact() ?? ''
      : parsedAmounts2[dependentField2]?.toSignificant(6) ?? '',
  }

  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] &&
    currencies[Field.OUTPUT] &&
    parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0)) &&
    !currencies[Field.INPUT].equals(currencies[Field.OUTPUT])
  )

  const routeNotFound = !trade?.route

  // check whether the user has approved the router on the input token
  // const [approvalState, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage, doArcher)
  const crossBridgeContract = useCrossBridgeContract()
  const [approvalState, approveCallback] = useApproveCallback(parsedAmount, crossBridgeContract.address)

  const signatureData = undefined

  const handleApprove = useCallback(async () => {
    await approveCallback()
  }, [approveCallback])
  // }, [approveCallback, gatherPermitSignature, signatureState])

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approvalState === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approvalState, approvalSubmitted])

  const maxInputAmount: CurrencyAmount<Currency> | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))

  // the callback to execute the swap
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(
    trade,
    allowedSlippage,
    recipient,
    signatureData,
    doArcher ? ttl : undefined
  )

  const [singleHopOnly] = useUserSingleHopOnly()

  const callPath = useMemo(() => {
    if (!currencies[Field.INPUT] || !currencies[Field.OUTPUT]) {
      return
    }
    if (currencies?.[Field.INPUT]?.equals(currencies?.[Field.OUTPUT])) {
      return [STABLE_USD[chainId].address]
    }
    if (trade) {
      return trade.route?.path.map((t) => t.address)
    }
  }, [currencies, trade, chainId])

  const destTokenAddr = useMemo(() => {
    if (!(currencies2[Field.OUTPUT] instanceof NativeCurrency)) {
      return currencies2[Field.OUTPUT]?.wrapped.address
    }
    return WNATIVE_ADDRESS[toChainId]
  }, [currencies2, toChainId])

  const amount = tryParseAmount(formattedAmounts[Field.INPUT], currencies[Field.INPUT])

  const { reqCallBack } = useCrossSwapCallback({ callPath, destTokenAddr, amount, toChainId })
  const [swapping, setSwapping] = useState(false)

  const handleSwap = useCallback(() => {
    // if (!swapCallback ) {
    //   return
    // }
    // if (priceImpact && !confirmPriceImpactWithoutFee(priceImpact)) {
    //   return
    // }
    if (Number(fiatValueOutput2?.toExact()) < 2) {
      alert('Too small Amount')
      return
    }

    if (!reqCallBack) {
      return
    }
    setSwapping(true)

    reqCallBack()
      .then((hash) => {
        console.log(hash)
      })
      .catch((e) => {
        console.error(e)
      })
      .finally(() => {
        setSwapping(false)
      })
  }, [fiatValueOutput2, reqCallBack])

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // warnings on slippage
  // const priceImpactSeverity = warningSeverity(priceImpactWithoutFee);
  const priceImpactSeverity = useMemo(() => {
    if (!(currencies[Field.INPUT] && currencies[Field.OUTPUT])) {
      return
    }
    if (currencies[Field.INPUT]?.equals(currencies[Field.OUTPUT])) {
      return 0
    }
    const executionPriceImpact = trade?.priceImpact
    return warningSeverity(
      executionPriceImpact && priceImpact
        ? executionPriceImpact.greaterThan(priceImpact)
          ? executionPriceImpact
          : priceImpact
        : executionPriceImpact ?? priceImpact
    )
  }, [priceImpact, trade, currencies])

  const isArgentWallet = useIsArgentWallet()

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !isArgentWallet &&
    !swapInputError &&
    (approvalState === ApprovalState.NOT_APPROVED ||
      approvalState === ApprovalState.PENDING ||
      (approvalSubmitted && approvalState === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const handleConfirmDismiss = useCallback(() => {
    setSwapState({
      showConfirm: false,
      tradeToConfirm,
      attemptingTxn,
      swapErrorMessage,
      txHash,
    })
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '')
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

  const handleAcceptChanges = useCallback(() => {
    setSwapState({
      tradeToConfirm: trade,
      swapErrorMessage,
      txHash,
      attemptingTxn,
      showConfirm,
    })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  const handleInputSelect = useCallback(
    (inputCurrency) => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency, true)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
  }, [maxInputAmount, onUserInput])

  const handleOutputSelect2 = useCallback(
    (outputCurrency) => onCurrencySelection2(Field.OUTPUT, outputCurrency, true),
    [onCurrencySelection2]
  )

  const swapIsUnsupported = useIsSwapUnsupported(currencies?.INPUT, currencies?.OUTPUT)

  const priceImpactTooHigh = priceImpactSeverity > 3 && !isExpertMode

  const [animateSwapArrows, setAnimateSwapArrows] = useState<boolean>(false)

  const previousChainId = usePrevious<ChainId>(chainId)

  useEffect(() => {
    const toNextInput = formattedAmounts[Field.OUTPUT]
    if (toNextInput === typedValue2) return
    if (toNextInput) {
      onUserInput2(Field.INPUT, toNextInput)
    } else {
      onUserInput2(Field.INPUT, '')
    }
  }, [formattedAmounts, onUserInput2, typedValue2])

  const SwapReqs = useMemo(() => {
    return (
      <tbody>
        {data.map((swapReq) => {
          const { amount, fromChain, toChain, sourceToken, destToken, transaction_hash, sig, payed } = swapReq
          const { r, s, v } = splitSignature(sig)
          return (
            <SwapRecord
              amount={amount}
              fromChain={fromChain}
              toChain={toChain}
              sourceToken={sourceToken}
              destToken={destToken}
              txhash={transaction_hash}
              sig={{ r, s, v }}
              payed={payed}
              key={swapReq.id}
            />
          )
        })}
      </tbody>
    )
  }, [data])

  const exchangeRate: Price<Currency, Currency> | null = useMemo(() => {
    // return new Price([currencies[Field.INPUT], currencies[Field.OUTPUT], formattedAmounts[Field.INPUT], formattedAmounts2[Field.OUTPUT]])
    if (
      !currencies[Field.INPUT] ||
      !currencies2[Field.OUTPUT] ||
      !parsedAmounts[Field.INPUT] ||
      !parsedAmounts2[Field.OUTPUT]
    )
      return null
    return new Price({
      baseAmount: parsedAmounts[Field.INPUT],
      quoteAmount: parsedAmounts2[Field.OUTPUT],
    })
  }, [currencies, currencies2, parsedAmounts, parsedAmounts2])

  return (
    <Container id="swap-page" className="py-4 md:py-8 lg:py-12">
      <Head>
        <title>{i18n._(t`HarvestSwap`)} | Harvest</title>
        <meta
          key="description"
          name="description"
          content="HarvestSwap allows for swapping of ERC20 compatible tokens across multiple networks"
        />
      </Head>
      <TokenWarningModal
        isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokens={importTokensNotInDefault}
        onConfirm={handleConfirmTokenWarning}
      />
      <DoubleGlowShadow>
        <div className="p-4 space-y-4 bg-white rounded z-1 swap-header-box ">
          {/*<SwapHeader*/}
          {/*  input={currencies[Field.INPUT]}*/}
          {/*  output={currencies[Field.OUTPUT]}*/}
          {/*  allowedSlippage={allowedSlippage}*/}
          {/*/>*/}

          {/*<ConfirmSwapModal*/}
          {/*  isOpen={showConfirm}*/}
          {/*  trade={trade}*/}
          {/*  originalTrade={tradeToConfirm}*/}
          {/*  onAcceptChanges={handleAcceptChanges}*/}
          {/*  attemptingTxn={attemptingTxn}*/}
          {/*  txHash={txHash}*/}
          {/*  recipient={recipient}*/}
          {/*  allowedSlippage={allowedSlippage}*/}
          {/*  onConfirm={handleSwap}*/}
          {/*  swapErrorMessage={swapErrorMessage}*/}
          {/*  onDismiss={handleConfirmDismiss}*/}
          {/*  minerBribe={doArcher ? archerETHTip : undefined}*/}
          {/*/>*/}
          <div>
            <CurrencyInputPanel
              // priceImpact={priceImpact}
              label={
                independentField === Field.OUTPUT && !showWrap ? i18n._(t`Swap From (est.):`) : i18n._(t`Swap From:`)
              }
              value={formattedAmounts[Field.INPUT]}
              showMaxButton={showMaxButton}
              currency={currencies[Field.INPUT]}
              onUserInput={handleTypeInput}
              onMax={handleMaxInput}
              fiatValue={fiatValueInput ?? undefined}
              onCurrencySelect={handleInputSelect}
              otherCurrency={currencies[Field.OUTPUT]}
              showCommonBases={true}
              id="swap-currency-input"
            />
            <AutoColumn justify="space-between" className="py-3">
              <div
                className={classNames(isExpertMode ? 'justify-between' : 'flex-start', 'px-4 flex-wrap w-full flex')}
              >
                <button
                  className="z-10 -mt-6 -mb-6 rounded-full"
                // onClick={() => {
                //   setApprovalSubmitted(false) // reset 2 step UI for approvals
                //   onSwitchTokens()
                // }}
                >
                  <div className="rounded-full bg-green-connect p-3px">
                    <div
                      className="p-3 bg-white rounded-full"
                      onMouseEnter={() => setAnimateSwapArrows(true)}
                      onMouseLeave={() => setAnimateSwapArrows(false)}
                    >
                      <Lottie
                        animationData={swapArrowsAnimationData}
                        autoplay={animateSwapArrows}
                        loop={false}
                        style={{ width: 32, height: 32 }}
                      />
                    </div>
                  </div>
                </button>
                {isExpertMode ? (
                  recipient === null && !showWrap ? (
                    <Button variant="link" size="none" id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                      + Add recipient (optional)
                    </Button>
                  ) : (
                    <Button
                      variant="link"
                      size="none"
                      id="remove-recipient-button"
                      onClick={() => onChangeRecipient(null)}
                    >
                      - {i18n._(t`Remove recipient`)}
                    </Button>
                  )
                ) : null}
              </div>
            </AutoColumn>

            <div>
              {/*<CurrencyInputPanel*/}
              {/*  value={formattedAmounts[Field.OUTPUT]}*/}
              {/*  onUserInput={handleTypeOutput}*/}
              {/*  label={independentField === Field.INPUT && !showWrap ? i18n._(t`Swap To (est.):`) : i18n._(t`Swap To:`)}*/}
              {/*  showMaxButton={false}*/}
              {/*  hideBalance={true}*/}
              {/*  fiatValue={fiatValueOutput ?? undefined}*/}
              {/*  priceImpact={priceImpact}*/}
              {/*  currency={currencies[Field.OUTPUT]}*/}
              {/*  // onCurrencySelect={handleOutputSelect}*/}
              {/*  otherCurrency={currencies[Field.INPUT]}*/}
              {/*  showCommonBases={true}*/}
              {/*  id="swap-currency-output"*/}
              {/*/>*/}
              {/*<CurrencyInputPanel*/}
              {/*  value={formattedAmounts2[Field.INPUT]}*/}
              {/*  onUserInput={handleTypeInput2}*/}
              {/*  label={independentField === Field.INPUT && !showWrap ? i18n._(t`Swap To (est.):`) : i18n._(t`Swap To:`)}*/}
              {/*  showMaxButton={false}*/}
              {/*  hideBalance={true}*/}
              {/*  fiatValue={fiatValueOutput ?? undefined}*/}
              {/*  priceImpact={priceImpact}*/}
              {/*  currency={currencies2[Field.INPUT]}*/}
              {/*  // onCurrencySelect={handleOutputSelect}*/}
              {/*  // otherCurrency={currencies[Field.INPUT]}*/}
              {/*  showCommonBases={true}*/}
              {/*  id="swap-currency-input-2"*/}
              {/*/>*/}
              <CurrencyInputPanel
                value={formattedAmounts2[Field.OUTPUT]}
                label={i18n._(t`Swap To (est.):`)}
                showMaxButton={false}
                hideBalance={true}
                // fiatValue={fiatValueOutput ?? undefined}
                currency={currencies2[Field.OUTPUT]}
                onCurrencySelect={handleOutputSelect2}
                showCommonBases={true}
                toChainId={toChainId}
                onChainSelect={onChainSelect}
                fiatValue={fiatValueOutput2}
                id="swap-currency-output-2"
              />
              {Boolean(exchangeRate) && (
                <div className="p-1 -mt-2 cursor-pointer rounded-b-md bg-whitesmoke">
                  <TradePrice
                    price={exchangeRate}
                    showInverted={showInverted}
                    setShowInverted={setShowInverted}
                    className="bg-white"
                  />
                </div>
              )}
              {priceCrossImpact && <div className="text-right text-red">Price Impact: {priceCrossImpact} %</div>}
            </div>
          </div>

          {recipient !== null && !showWrap && (
            <>
              <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
              {recipient !== account && (
                <Alert
                  type="warning"
                  dismissable={false}
                  showIcon
                  message={i18n._(
                    t`Please note that the recipient address is different from the connected wallet address.`
                  )}
                />
              )}
            </>
          )}

          {/* {showWrap ? null : (
            <div
              style={{
                padding: showWrap ? '.25rem 1rem 0 1rem' : '0px',
              }}
            >
              <div className="px-5 mt-1">{doArcher && userHasSpecifiedInputOutput && <MinerTip />}</div>
            </div>
          )} */}

          {/*{trade && (*/}
          {/*  <div className="p-5 rounded bg-whitesmoke">*/}
          {/*    <AdvancedSwapDetails trade={trade} allowedSlippage={allowedSlippage} />*/}
          {/*  </div>*/}
          {/*)}*/}

          {/*{v2Trade2 && (*/}
          {/*  <div className="p-5 rounded bg-whitesmoke">*/}
          {/*    <AdvancedSwapDetails trade={v2Trade2} allowedSlippage={allowedSlippage2} />*/}
          {/*  </div>*/}
          {/*)}*/}

          <BottomGrouping>
            {swapIsUnsupported ? (
              <Button color="red" size="lg" disabled>
                {i18n._(t`Unsupported Asset`)}
              </Button>
            ) : !account ? (
              <Web3Connect size="lg" color="blue" className="w-full bg-gradient-button-colour" />
            ) : showWrap ? (
              <Button color="green" size="lg" disabled={Boolean(wrapInputError)} onClick={onWrap}>
                {wrapInputError ??
                  (wrapType === WrapType.WRAP
                    ? i18n._(t`Wrap`)
                    : wrapType === WrapType.UNWRAP
                      ? i18n._(t`Unwrap`)
                      : null)}
              </Button>
            ) : routeNotFound && userHasSpecifiedInputOutput ? (
              <div style={{ textAlign: 'center' }}>
                <div className="mb-1">{i18n._(t`Insufficient liquidity for this trade`)}</div>
                {singleHopOnly && <div className="mb-1">{i18n._(t`Try enabling multi-hop trades`)}</div>}
              </div>
            ) : showApproveFlow ? (
              <div>
                {approvalState !== ApprovalState.APPROVED && (
                  <ButtonConfirmed
                    onClick={handleApprove}
                    disabled={approvalState !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                    size="lg"
                  >
                    {approvalState === ApprovalState.PENDING ? (
                      <div className="flex items-center justify-center h-full space-x-2">
                        <div>Approving</div>
                        <Loader stroke="white" />
                      </div>
                    ) : (
                      i18n._(t`Approve ${currencies[Field.INPUT]?.symbol}`)
                    )}
                  </ButtonConfirmed>
                )}
                {approvalState === ApprovalState.APPROVED && (
                  <ButtonError
                    onClick={() => {
                      // if (isExpertMode) {
                      handleSwap()
                      // } else {
                      //   setSwapState({
                      //     tradeToConfirm: trade,
                      //     attemptingTxn: false,
                      //     swapErrorMessage: undefined,
                      //     showConfirm: true,
                      //     txHash: undefined,
                      //   })
                      // }
                    }}
                    style={{
                      width: '100%',
                    }}
                    id="swap-button"
                    className="bg-gradient-button-colour"
                    disabled={
                      !isValid ||
                      approvalState !== ApprovalState.APPROVED ||
                      (priceImpactSeverity > 3 && !isExpertMode) ||
                      swapping
                    }
                    error={isValid && priceImpactSeverity > 2}
                  >
                    {priceImpactSeverity > 3 && !isExpertMode
                      ? i18n._(t`Price Impact High`)
                      : priceImpactSeverity > 2
                        ? i18n._(t`Swap Anyway`)
                        : i18n._(t`Swap`)}
                  </ButtonError>
                )}
              </div>
            ) : (
              <ButtonError
                onClick={handleSwap}
                id="swap-button"
                className="bg-gradient-button-colour"
                disabled={
                  !isValid ||
                  (priceImpactSeverity > 3 && !isExpertMode) ||
                  (!!swapCallbackError && !currencies[Field.INPUT].equals(STABLE_USD[chainId])) ||
                  swapping
                }
                error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
              >
                {swapInputError
                  ? swapInputError
                  : priceImpactSeverity > 3 && !isExpertMode
                    ? i18n._(t`Price Impact Too High`)
                    : priceImpactSeverity > 2
                      ? i18n._(t`Swap Anyway`)
                      : i18n._(t`Swap`)}
              </ButtonError>
            )}
            {showApproveFlow && (
              <Column style={{ marginTop: '1rem' }}>
                <ProgressSteps steps={[approvalState === ApprovalState.APPROVED]} />
              </Column>
            )}
            {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
          </BottomGrouping>

          {!swapIsUnsupported ? null : (
            <UnsupportedCurrencyFooter show={swapIsUnsupported} currencies={[currencies.INPUT, currencies.OUTPUT]} />
          )}
        </div>
      </DoubleGlowShadow>
      <div className="mt-6">
        <TableHeading className="font-bold font-color-white ">My Cross History</TableHeading>
        <TableWrapper>
          <HistoryTable className="w-full bg-color">
            <thead>
              <tr>
                <th>From</th>
                <th>Currency</th>
                <th>To</th>
                <th>Currency</th>
                <th>Amount($)</th>
                <th>Status</th>
              </tr>
            </thead>

            {SwapReqs}
          </HistoryTable>
        </TableWrapper>
      </div>
    </Container>
  )
}
