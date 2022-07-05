import React, { useMemo } from 'react'
import Image from 'next/image'
import { NETWORK_ICON, NETWORK_LABEL } from '../../../config/networks'
import CurrencyLogo from '../../../components/CurrencyLogo'
import { useCurrency } from '../../../hooks/Tokens'
import { ChainId, CurrencyAmount, NATIVE, Rounding, WNATIVE, WNATIVE_ADDRESS } from '@sushiswap/sdk'
import Button from '../../../components/Button'
import { SUPPORTED_NETWORKS } from '../../../modals/NetworkModal'
import cookie from 'cookie-cutter'
import { useActiveWeb3React } from '../../../hooks'
import { useDerivedSwapInfo, useSwapActionHandlers } from '../../../state/swap/hooks'
import { Field } from '../../../state/swap/actions'
import { STABLE_USD } from '../../../config/tokens'
import { useV2TradeExactIn } from '../../../hooks/useV2Trades'
import { tryParseAmount } from '../../../functions'
import { useCrossSwapClaimCallback } from '../../../hooks/useCrossSwapCallback'

interface SwapRecordProps {
  amount: string
  fromChain: number
  toChain: number
  sourceToken: string
  destToken: string
  txhash: string
  sig: { v: number; r: string; s: string }
  payed: boolean | null
}

export default function SwapRecord({
  amount,
  fromChain,
  toChain,
  sourceToken,
  destToken,
  txhash,
  sig,
  payed,
}: SwapRecordProps) {

  const sourceCurrency = useCurrency(sourceToken, fromChain)
  const destCurrency = useCurrency(destToken, toChain)

  const { library, account, chainId } = useActiveWeb3React()

  const tradeInAmount = CurrencyAmount.fromRawAmount(STABLE_USD[fromChain], amount)

  const tradeInputAmount = tryParseAmount(
    tradeInAmount.toSignificant(STABLE_USD[toChain].decimals),
    STABLE_USD[toChain]
  )

  const trade = useV2TradeExactIn(tradeInputAmount, destCurrency)

  const callPath = useMemo(() => {
    if (trade) {
      if (STABLE_USD[toChain].equals(destCurrency)) {
        return [STABLE_USD[toChain].address]
      } else {
        return trade.route?.path.map((t) => t.address)
      }
    }
  }, [trade])

  const { reqCallBack } = useCrossSwapClaimCallback({
    callPath,
    sourceToken,
    amount: tradeInAmount,
    fromChain,
    txhash,
    sig,
    decimals: STABLE_USD[fromChain].decimals,
  })

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()

  const onClaim = () => {
    if (chainId !== toChain) {
      const params = SUPPORTED_NETWORKS[toChain]
      cookie.set('chainId', toChain)
      if (toChain === ChainId.MAINNET) {
        library?.send('wallet_switchEthereumChain', [{ chainId: '0x1' }, account])
      } else {
        library?.send('wallet_addEthereumChain', [params, account])
      }
    } else {
      reqCallBack()
    }
    // onCurrencySelection(Field.OUTPUT, destCurrency, true)
    // onCurrencySelection(Field.INPUT, STABLE_USD[toChain], true)
  }

  return (
    <tr key={txhash}>
      <td>
        <div className="flex items-center">
          <Image src={NETWORK_ICON[fromChain]} alt="Network" className="rounded-md" width="32px" height="32px" />
          &nbsp;
          {NETWORK_LABEL[fromChain]}
        </div>
      </td>
      <td>
        <div className="flex items-center">
          <CurrencyLogo currency={sourceCurrency} />
          &nbsp;
          {sourceCurrency.equals(WNATIVE[fromChain]) ? NATIVE[fromChain].name: sourceCurrency.name}
        </div>
      </td>
      <td>
        <div className="flex items-center">
          <Image src={NETWORK_ICON[toChain]} alt="Network" className="rounded-md" width="32px" height="32px" />
          &nbsp;
          {NETWORK_LABEL[toChain]}
        </div>
      </td>
      <td>
        <div className="flex items-center">
          <CurrencyLogo currency={destCurrency} />
          &nbsp;
          {destCurrency.equals(WNATIVE[toChain]) ? NATIVE[toChain].name: destCurrency.name}
        </div>
      </td>
      <td>
        {tradeInAmount.toSignificant(2)}
      </td>
      <td>
        {payed ? (
          'Done'
        ) : (
          <Button variant="filled" color="green" style={{fontSize:15}} size="xs" onClick={onClaim}>
            Claim
          </Button>
        )}
      </td>
    </tr>
  )
}
